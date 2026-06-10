/**
 * screenshot-mobile.mjs — Mobile viewport screenshot via CDP
 */
import { spawn } from 'child_process';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = join(__dirname, 'temporary screenshots');
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const LABEL = process.argv[3] || 'mobile';

await mkdir(OUT_DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const files = await readdir(OUT_DIR).catch(() => []);
const nums = files.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1])).filter(n => !isNaN(n));
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const chrome = spawn(CHROME, [
  '--remote-debugging-port=9231',
  '--headless=new',
  `--user-data-dir=/tmp/ib-shot-profile-${process.pid}`,
  '--no-first-run',
  '--disable-extensions',
  '--no-sandbox',
  '--disable-gpu',
  '--window-size=430,932',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

await sleep(1500);

let wsUrl;
for (let i = 0; i < 10; i++) {
  try {
    const r = await fetch('http://127.0.0.1:9231/json');
    const tabs = await r.json();
    wsUrl = tabs[0]?.webSocketDebuggerUrl;
    if (wsUrl) break;
  } catch {}
  await sleep(400);
}
if (!wsUrl) { chrome.kill(); throw new Error('Chrome CDP not available'); }

let msgId = 1;
const ws = new WebSocket(wsUrl);
const pending = new Map();

ws.addEventListener('message', e => {
  try {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  } catch {}
});

await new Promise(r => ws.addEventListener('open', r, { once: true }));

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }
    }, 30000);
  });
}

// iPhone 17 Pro — 430x932 viewport, 2x scale
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1' });
await send('Page.navigate', { url: BASE_URL });
await sleep(5000);

const name = `screenshot-${next}-${LABEL}.png`;
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: process.env.FULL === '1' });
await writeFile(join(OUT_DIR, name), Buffer.from(data, 'base64'));
console.log(`Screenshot saved: ${name}`);

ws.close();
chrome.kill();
