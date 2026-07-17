#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES, SITE } from "./shell-snippets.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = (await readdir(root)).filter((file) => file.endsWith(".html"));
const areaServed = CITIES.map((city) => ({
  "@type": "City",
  name: city.name,
  address: { "@type": "PostalAddress", addressRegion: "NC" }
}));

function isBusinessNode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  const hasBusinessType = types.some((type) => ["FoodTruck", "FoodEstablishment", "LocalBusiness"].includes(type));
  const isBusinessId = node["@id"] === `${SITE.origin}/#business`;
  return (isBusinessId && (node.name === SITE.name || hasBusinessType))
    || (node.name === SITE.name && hasBusinessType);
}

function isBareBusinessReference(node) {
  return node?.["@id"] === `${SITE.origin}/#business` && !node["@type"] && !node.name;
}

function updateNode(node) {
  if (Array.isArray(node)) return node.forEach(updateNode);
  if (!node || typeof node !== "object") return;
  if (isBareBusinessReference(node)) delete node.areaServed;
  else if (isBusinessNode(node)) node.areaServed = areaServed;
  for (const value of Object.values(node)) updateNode(value);
}

for (const file of files) {
  const path = join(root, file);
  let html = await readFile(path, "utf8");
  let changed = false;
  html = html.replace(/(<script[^>]+type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (full, open, json, close) => {
    try {
      const data = JSON.parse(json);
      const before = JSON.stringify(data);
      updateNode(data);
      const after = JSON.stringify(data);
      if (after === before) return full;
      changed = true;
      return `${open}${after}${close}`;
    } catch {
      return full;
    }
  });
  if (changed) {
    await writeFile(path, html);
    console.log(`${file}: 24-market business schema applied`);
  }
}
