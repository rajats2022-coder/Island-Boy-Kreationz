#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
const production = process.argv.includes("--production");
const currentPath = join(dataDir, "site-health.json");
const historyPath = join(dataDir, "site-health-history.json");
const htmlFiles = (await readdir(root)).filter((file) => file.endsWith(".html")).sort();
const findings = [];
const titles = new Map();
const canonicals = new Map();

function match(html, pattern) { return html.match(pattern)?.[1]?.trim() || ""; }
function add(severity, page, check, detail) { findings.push({ severity, page, check, detail }); }

for (const file of htmlFiles) {
  const html = await readFile(join(root, file), "utf8");
  const title = match(html, /<title>([\s\S]*?)<\/title>/i);
  const description = match(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || match(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const isPrivacy = file === "privacy.html";

  if (!title) add("error", file, "title", "Missing title");
  else if (titles.has(title)) add("error", file, "title", `Duplicate of ${titles.get(title)}`);
  else titles.set(title, file);
  if (!description) add("error", file, "description", "Missing meta description");
  if (h1Count !== 1) add("error", file, "h1", `Expected one H1, found ${h1Count}`);
  if (!canonical.startsWith("https://islandboykreationz.com/")) add("error", file, "canonical", canonical || "Missing canonical");
  else if (canonicals.has(canonical)) add("error", file, "canonical", `Duplicate of ${canonicals.get(canonical)}`);
  else canonicals.set(canonical, file);
  if (!/property=["']og:title["']/i.test(html) && !isPrivacy) add("error", file, "open-graph", "Missing og:title");
  if (!/application\/ld\+json/i.test(html) && !isPrivacy) add("error", file, "structured-data", "Missing JSON-LD");
  for (const block of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { JSON.parse(block[1]); } catch (error) { add("error", file, "structured-data", `Invalid JSON-LD: ${error.message}`); }
  }
  if (!/rel=["']apple-touch-icon["']/i.test(html)) add("error", file, "apple-icon", "Missing Apple touch icon");
  if (!/site-analytics\.js/i.test(html)) add("error", file, "analytics", "Missing consent-aware analytics loader");

  for (const href of [...html.matchAll(/href=["']([^"']+)["']/gi)].map((item) => item[1])) {
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) continue;
    const clean = href.split(/[?#]/)[0].replace(/^\//, "");
    if (!clean) continue;
    let target = normalize(join(root, clean));
    if (!extname(target)) target += ".html";
    if (!existsSync(target)) add("error", file, "internal-link", `Missing ${href}`);
  }
}

const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((item) => item[1]);
if (!sitemapUrls.length) add("error", "sitemap.xml", "sitemap", "No URLs found");
if (/catering-(?:asheville|cary|durham|fayetteville|greensboro|harrisburg|hickory|high-point|indian-trail|kannapolis|matthews|mint-hill|monroe|mooresville|pineville|raleigh|salisbury|statesville|wilmington|winston-salem)-nc/i.test(sitemap)) {
  add("error", "sitemap.xml", "service-area-truth", "Unverified city URL remains in sitemap");
}

const productionChecks = [];
if (production) {
  for (const url of sitemapUrls) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      productionChecks.push({ url, status: response.status, finalUrl: response.url, ok: response.ok });
      if (!response.ok) add("error", url, "production-http", `HTTP ${response.status}`);
    } catch (error) {
      productionChecks.push({ url, status: 0, ok: false, error: error.message });
      add("error", url, "production-http", error.message);
    }
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  production,
  pageCount: htmlFiles.length,
  sitemapUrlCount: sitemapUrls.length,
  errors: findings.filter((item) => item.severity === "error").length,
  findings,
  productionChecks
};
await mkdir(dataDir, { recursive: true });
await writeFile(currentPath, `${JSON.stringify(report, null, 2)}\n`);
let history = [];
try { history = JSON.parse(await readFile(historyPath, "utf8")); } catch {}
history.push({ checkedAt: report.checkedAt, production, pageCount: report.pageCount, sitemapUrlCount: report.sitemapUrlCount, errors: report.errors });
await writeFile(historyPath, `${JSON.stringify(history.slice(-104), null, 2)}\n`);

console.log(`Site health: pages=${report.pageCount} sitemap=${report.sitemapUrlCount} errors=${report.errors} production=${production}`);
for (const finding of findings) console.log(`${finding.severity.toUpperCase()} ${finding.page} ${finding.check}: ${finding.detail}`);
if (report.errors) process.exitCode = 1;
