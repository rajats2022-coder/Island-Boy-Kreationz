/**
 * screenshot.mjs — Headless Chrome screenshot via CDP
 * Usage: node screenshot.mjs [url] [label]
 */
import { spawn } from 'child_process';
import { writeFile, mkdir, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = join(__dirname, 'temporary screenshots');
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const LABEL = process.argv[3] || '';

await mkdir(OUT_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Find next screenshot number
const files = await readdir(OUT_DIR).catch(() => []);
const nums = files.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1])).filter(n => !isNaN(n));
const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;

const chrome = spawn(CHROME, [
  '--remote-debugging-port=9229',
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--window-size=1440,900',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });

await sleep(1500);

let wsUrl;
for (let i = 0; i < 10; i++) {
  try {
    const r = await fetch('http://127.0.0.1:9229/json');
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
    }, 90000);
  });
}

await send('Page.enable');
await send('Page.navigate', { url: BASE_URL });
await sleep(3000);

const name = `screenshot-${next}${LABEL ? '-' + LABEL : ''}.png`;
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await sleep(2000);
const { data } = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(join(OUT_DIR, name), Buffer.from(data, 'base64'));
console.log(`Screenshot saved: ${name}`);

ws.close();
chrome.kill();
