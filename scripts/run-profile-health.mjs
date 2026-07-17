#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const runs = [
  ["site", [join(root, "scripts", "site-health.mjs"), "--production"]],
  ["profile", [join(root, "scripts", "island-boy-gbp.mjs"), "--audit-profile"]]
];
let failed = false;

for (const [label, argv] of runs) {
  const result = spawnSync(process.execPath, argv, { cwd: root, stdio: "inherit", env: process.env });
  if (result.status !== 0) {
    failed = true;
    console.error(`${label} health check exited ${result.status ?? "without a status"}.`);
  }
}

if (failed) process.exitCode = 1;
