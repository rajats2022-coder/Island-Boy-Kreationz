/**
 * cdp-shot.mjs — screenshot with optional pre-capture JS (for dropdown/menu states).
 * Usage: node scripts/cdp-shot.mjs <url> <label> [jsExpression] [--mobile] [--full]
 */
import { spawn } from 'child_process';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = join(ROOT, 'temporary screenshots');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const [BASE_URL, LABEL = 'shot', EXPR = ''] = args;
const MOBILE = flags.has('--mobile');
const FULL = flags.has('--full');
const W = MOBILE ? 430 : 1440, H = MOBILE ? 932 : 900;

await mkdir(OUT_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const files = await readdir(OUT_DIR).catch(() => []);
const nums = files.map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1])).filter((n) => !isNaN(n));
const next = nums.length ? Math.max(...nums) + 1 : 1;

const chrome = spawn(CHROME, ['--remote-debugging-port=9233', '--headless=new',
  `--user-data-dir=/tmp/ib-shot-profile-${process.pid}`,
  '--no-first-run',
  '--disable-extensions', '--no-sandbox', '--disable-gpu', `--window-size=${W},${H}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
await sleep(1500);

let wsUrl;
for (let i = 0; i < 10; i++) {
  try {
    const tabs = await (await fetch('http://127.0.0.1:9233/json')).json();
    wsUrl = tabs[0]?.webSocketDebuggerUrl;
    if (wsUrl) break;
  } catch {}
  await sleep(400);
}
if (!wsUrl) { chrome.kill(); throw new Error('Chrome CDP not available'); }

let msgId = 1;
const ws = new WebSocket(wsUrl);
const pending = new Map();
ws.addEventListener('message', (e) => {
  try {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  } catch {}
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const send = (method, params = {}, timeout = 30000) => new Promise((resolve, reject) => {
  const id = msgId++;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
  setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`Timeout: ${method}`)); } }, timeout);
});

await send('Page.enable');
if (flags.has('--nojs')) await send('Emulation.setScriptExecutionDisabled', { value: true });
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: MOBILE ? 2 : 1, mobile: MOBILE });
await send('Page.navigate', { url: BASE_URL });
await sleep(3500);
if (EXPR) { await send('Runtime.evaluate', { expression: EXPR }); await sleep(700); }
const name = `screenshot-${next}-${LABEL}.png`;
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: FULL }, 90000);
await writeFile(join(OUT_DIR, name), Buffer.from(data, 'base64'));
console.log(`Screenshot saved: ${name}`);
ws.close();
chrome.kill();
