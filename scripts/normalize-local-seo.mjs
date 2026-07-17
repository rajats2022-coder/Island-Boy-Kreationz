#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ...(await readdir(root)).filter((file) => file.endsWith(".html")),
  "llms-full.txt"
];

const replacements = [
  ["[\"Charlotte NC\",\"Concord NC\",\"Gastonia NC\",\"Huntersville NC\"]\"", "[\"Charlotte NC\",\"Concord NC\",\"Gastonia NC\",\"Huntersville NC\"]"],
  ["Our North Carolina service-area guide includes Charlotte, Concord, Gastonia, and Huntersville, Raleigh, Durham, Cary, Winston-Salem, High Point, Gastonia, Huntersville, Kannapolis, Mooresville, and many additional North Carolina cities.", "The verified website service-area guide includes Charlotte, Concord, Gastonia, and Huntersville. Other addresses require direct confirmation."],
  ["- Caribbean catering Raleigh, Durham, Cary, Winston-Salem, High Point, Gastonia, Huntersville, Kannapolis, and Mooresville", "- Caribbean catering Charlotte, Concord, Gastonia, and Huntersville"],
  ["Charlotte, Concord, Greensboro, and nearby North Carolina", "Charlotte, Concord, Gastonia, and Huntersville"],
  ["Charlotte, Concord, Greensboro, and nearby NC", "Charlotte, Concord, Gastonia, and Huntersville"],
  ["Charlotte, Concord, Greensboro", "Charlotte, Concord, Gastonia, and Huntersville"],
  ["Instagram, Facebook, or TikTok", "Instagram"],
  ["around Charlotte and North Carolina", "in Charlotte, Concord, Gastonia, and Huntersville"],
  ["across Charlotte and nearby North Carolina", "in Charlotte, Concord, Gastonia, and Huntersville"],
  ["catering, and Greensboro event inquiries", "catering, and Huntersville event inquiries"],
  ["including Concord, Greensboro, Raleigh, Durham, Cary, Winston-Salem, High Point, Gastonia, Huntersville, Kannapolis, Mooresville, and nearby cities", "including Charlotte, Concord, Gastonia, and Huntersville"],
  ["Does Island Boy Kreationz serve Greensboro NC?", "Does Island Boy Kreationz serve Gastonia and Huntersville NC?"],
  ["Greensboro inquiries can be reviewed for larger or planned events when the guest count, timing, and travel make sense.", "Yes. Gastonia and Huntersville are verified service areas; every event is still confirmed for date, address, service format, and truck access."],
  ["Does Island Boy Kreationz serve Raleigh, Durham, or Cary?", "Can Island Boy Kreationz consider an address outside the listed service area?"],
  ["Raleigh, Durham, and Cary can be reviewed for planned events with enough notice. Events may require planning, travel review, and custom quote approval.", "Yes, but it is not assumed. Send the exact address, date, guest count, and service format so the team can confirm travel fit before quoting."],
  ["Our North Carolina service-area guide includes Charlotte, Concord, Greensboro, Raleigh, Durham, Cary, Winston-Salem, High Point, Gastonia, Huntersville, Kannapolis, Mooresville, and many additional North Carolina cities.", "The verified website service-area guide includes Charlotte, Concord, Gastonia, and Huntersville. Other addresses require direct confirmation."],
  ["What cities in North Carolina does the website target?", "Which service areas are verified on the website?"],
  ["View all NC service areas", "View verified service areas"],
  ["North Carolina Caribbean catering FAQ hub", "Charlotte-area Caribbean catering FAQ"],
  ["across North Carolina.", "in the verified Charlotte-area market."],
  ["areaServed\":\"North Carolina", "areaServed\":[\"Charlotte NC\",\"Concord NC\",\"Gastonia NC\",\"Huntersville NC\"]"],
  ["North Carolina catering", "Charlotte-area catering"],
  ["Caribbean soul food catering near Charlotte, Concord, and Greensboro.", "Caribbean food truck catering in Charlotte, Concord, Gastonia, and Huntersville."],
  ["across the Charlotte region and nearby North Carolina cities.", "across the four verified Charlotte-area markets."],
  ["Greensboro & Nearby NC Catering", "Gastonia & Huntersville Catering"],
  ["For larger events and planned bookings, Island Boy Kreationz can support inquiries from Greensboro and nearby North Carolina regions close enough for the right event.", "Gastonia and Huntersville are verified service areas. Send the venue, date, guest count, and service window so the team can confirm the booking."],
  ["Food Truck Catering for Charlotte, Concord, Greensboro, and nearby NC", "Food Truck Catering for Charlotte, Concord, Gastonia, and Huntersville"],
  ["Caribbean soul food catering guides for North Carolina events.", "Caribbean food truck catering guides for the Charlotte area."],
  ["Why Oxtail Bowls and Oxtail Meals Work for North Carolina Events", "Why Oxtail Bowls and Meals Work for Charlotte-Area Events"],
  ["Oxtail Catering NC | Oxtail Bowls Charlotte Concord Greensboro", "Oxtail Catering Charlotte Area | Island Boy Kreationz"],
  ["Learn why oxtail meals and oxtail bowls are strong catering options for Charlotte, Concord, Greensboro, and nearby North Carolina events.", "Learn why oxtail meals and bowls work for catering in Charlotte, Concord, Gastonia, and Huntersville."],
  ["Why Oxtail Bowls and Oxtail Meals Work for North Carolina Events", "Why Oxtail Bowls and Meals Work for Charlotte-Area Events"],
  ["Charlotte, Concord, Greensboro, and nearby NC events can use oxtail bowls or meals as a centerpiece when the goal is flavor and satisfaction.", "Charlotte, Concord, Gastonia, and Huntersville events can use oxtail bowls or meals as a memorable catering centerpiece."],
  ["is the North Carolina service-area hub", "lists the four verified Charlotte-area markets"],
  ["- Caribbean catering Greensboro NC", "- Caribbean catering Gastonia NC\n- Caribbean catering Huntersville NC"],
  ["- Oxtail catering North Carolina", "- Oxtail catering Charlotte area"],
  ["City pages target catering searches across 24 North Carolina cities: Charlotte, Concord, Huntersville, Kannapolis, Mooresville, Gastonia, Matthews, Mint Hill, Indian Trail, Monroe, Pineville, Harrisburg, Salisbury, Statesville, Hickory, Greensboro, Winston-Salem, High Point, Raleigh, Durham, Cary, Asheville, Fayetteville, and Wilmington.", "City pages cover only the four markets verified on the live Google Business Profile: Charlotte, Concord, Gastonia, and Huntersville."],
];

for (const file of files) {
  let text;
  try { text = await readFile(join(root, file), "utf8"); } catch { continue; }
  const original = text;
  for (const [from, to] of replacements) text = text.split(from).join(to);
  if (text !== original) {
    await writeFile(join(root, file), text);
    console.log(`${file}: normalized verified service-area language`);
  }
}
