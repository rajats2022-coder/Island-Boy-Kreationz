#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pages = (await readdir(root)).filter((file) => file.endsWith(".html"));
const favicon = '<link rel="icon" type="image/png" href="/assets/favicon-32x32.png">';
const appleIcon = '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">';
const analytics = '<script src="/site-analytics.js" defer></script>';

for (const page of pages) {
  const path = join(root, page);
  let html = await readFile(path, "utf8");
  const notes = [];

  if (/<link[^>]+rel=["']icon["'][^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]+rel=["']icon["'][^>]*>/i, favicon);
  } else {
    html = html.replace("</head>", `${favicon}</head>`);
  }
  if (!/rel=["']apple-touch-icon["']/i.test(html)) html = html.replace("</head>", `${appleIcon}</head>`);
  if (!/site-analytics\.js/i.test(html)) html = html.replace("</head>", `${analytics}</head>`);

  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    let next = tag;
    if (!/\bdecoding=/i.test(next)) next = next.replace(/>$/, ' decoding="async">');
    const shouldLazy = !/\bloading=/i.test(next) && !/island-boy-logo|new-hero|glass-logo|hero-/i.test(next);
    if (shouldLazy) next = next.replace(/>$/, ' loading="lazy">');
    return next;
  });

  await writeFile(path, html);
  notes.push("favicon", "apple icon", "analytics", "image hints");
  console.log(`${page}: ${notes.join(", ")}`);
}
