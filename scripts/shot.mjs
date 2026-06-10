/**
 * shot.mjs — Puppeteer screenshot (uses the agent-dashboard puppeteer install
 * and its bundled Chrome-for-Testing, independent of system Chrome).
 *
 * Usage: node scripts/shot.mjs <url> <label> [jsExpression] [--mobile] [--full]
 */
import { mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';

const puppeteer = (await import(pathToFileURL('/Users/rajatsingh/Downloads/S4 AI Agency/agent dashboard/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js').href)).default;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'temporary screenshots');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const [URL_ARG, LABEL = 'shot', EXPR = ''] = args;
const MOBILE = flags.has('--mobile');
const FULL = flags.has('--full');

await mkdir(OUT_DIR, { recursive: true });
const files = await readdir(OUT_DIR).catch(() => []);
const nums = files.map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1])).filter((n) => !isNaN(n));
const next = nums.length ? Math.max(...nums) + 1 : 1;
const name = `screenshot-${next}-${LABEL}.png`;

const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  await page.setViewport(MOBILE
    ? { width: 430, height: 932, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL_ARG, { waitUntil: 'networkidle0', timeout: 45000 });
  if (FULL) {
    // walk the page so loading="lazy" images actually load, then return to top
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await new Promise((r) => setTimeout(r, 600));
  }
  if (EXPR) { await page.evaluate(EXPR); await new Promise((r) => setTimeout(r, 700)); }
  await page.screenshot({ path: join(OUT_DIR, name), fullPage: FULL });
  console.log(`Screenshot saved: ${name}`);
} finally {
  await browser.close();
}
