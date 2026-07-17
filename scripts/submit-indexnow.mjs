#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const host = "islandboykreationz.com";
const origin = `https://${host}`;
const key = (await readFile(join(root, "indexnow-key.txt"), "utf8")).trim();
const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

if (!/^[a-f0-9-]{8,128}$/i.test(key)) throw new Error("IndexNow key format is invalid.");
if (!urlList.length || urlList.some((url) => !url.startsWith(`${origin}/`))) {
  throw new Error("Sitemap contains no valid canonical Island Boy URLs.");
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `${origin}/indexnow-key.txt`, urlList })
});

if (![200, 202].includes(response.status)) {
  const body = (await response.text()).slice(0, 500);
  throw new Error(`IndexNow submission failed (${response.status}): ${body}`);
}

console.log(`IndexNow accepted ${urlList.length} canonical URLs (${response.status}).`);
