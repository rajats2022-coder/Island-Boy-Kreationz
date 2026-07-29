#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "about.html",
  "blog.html",
  "blog-oxtail-catering-nc.html",
  "contact.html",
  "faq.html",
  "index.html",
  "llms-full.txt"
];

const replacements = [
  ["across 24 North Carolina markets", "across 18 verified North Carolina service areas"],
  ["24 North Carolina markets", "18 verified North Carolina service areas"],
  ["24 North Carolina Markets", "18 Verified North Carolina Service Areas"],
  ["24 listed catering markets", "18 verified service areas"],
  ["lists 24 North Carolina catering markets", "lists 18 verified North Carolina service areas"],
  [
    "grouped by Charlotte metro, Triad, Triangle, and extended travel",
    "covering Charlotte metro and the verified advance-booking areas"
  ],
  [
    "Charlotte, the Triad, the Triangle, and advance-booking North Carolina markets",
    "Charlotte metro and verified advance-booking North Carolina service areas"
  ],
  [
    "Charlotte-metro dates are closest to home; Triad, Triangle, and extended-travel events are available with advance booking and route confirmation.",
    "Charlotte-metro dates are closest to home; the other verified service areas require advance booking and route confirmation."
  ],
  ["Triad & Extended-Travel Catering", "Advance-Booking Service Areas"],
  [
    "Greensboro, Winston-Salem, High Point, the Triangle, and extended-travel destinations are reviewed with the exact venue and event plan.",
    "Greensboro, Winston-Salem, High Point, and the other verified service areas are reviewed with the exact venue and event plan."
  ]
];

for (const file of files) {
  const path = join(root, file);
  const before = await readFile(path, "utf8");
  const after = replacements.reduce(
    (content, [from, to]) => content.replaceAll(from, to),
    before
  );
  if (after === before) {
    console.log(`${file}: already current`);
    continue;
  }
  await writeFile(path, after);
  console.log(`${file}: verified 18-area language applied`);
}
