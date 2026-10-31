import { spawn } from 'node:child_process';
import fs from 'node:fs';

const APP = 'http://localhost:3001';
const API = 'http://localhost:5000/api';
const ENCOUNTER = process.argv[2];
const OUT = process.argv[3] || '.tmp-orders';
const PORT = 9223;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = process.env.TEMP + '\\cdp-verify-' + Date.now();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const login = await (await fetch(API + '/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'superadmin', password: 'superadmin123' }),
})).json();

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  '--remote-debugging-port=' + PORT, '--window-size=1600,1500',
  '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

let ws;
for (let i = 0; i < 40; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = list.find(p => p.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); break; }
  } catch {}
  await sleep(250);
}
if (!ws) { console.error('no cdp'); chrome.kill(); process.exit(1); }
await new Promise(r => ws.addEventListener('open', r));

let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const cdp = (method, params = {}) => new Promise(resolve => {
  const myId = ++id;
  pending.set(myId, resolve);
  ws.send(JSON.stringify({ id: myId, method, params }));
});

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1500, deviceScaleFactor: 1, mobile: false });

await cdp('Page.navigate', { url: APP + '/login' });
await sleep(1500);
const user = JSON.stringify(login.data.user);
const token = login.data.accessToken;
await cdp('Runtime.evaluate', { expression: `
  localStorage.setItem('auth_token', ${JSON.stringify(token)});
  localStorage.setItem('auth-storage', JSON.stringify({ state: { user: ${user}, token: ${JSON.stringify(token)}, refreshToken: ${JSON.stringify(login.data.refreshToken)}, isInitialized: true }, version: 0 }));
` });

const shoot = async (hash, clickText, name, marker) => {
  await cdp('Page.navigate', { url: `${APP}/dashboard/medical-entries/${ENCOUNTER}?shot=${Date.now()}${hash}` });
  for (let i = 0; i < 60; i++) {
    await sleep(500);
    const ready = await cdp('Runtime.evaluate', { expression: `!![...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith('Labs'))`, returnByValue: true });
    if (ready.result?.result?.value) break;
  }
  await sleep(600);
  const probe = await cdp('Runtime.evaluate', { expression: `({ href: location.href, text: document.body.innerText.slice(0, 120), hasCard: !!document.querySelector('table') })`, returnByValue: true });
  console.log(name, JSON.stringify(probe.result?.result?.value));
  if (clickText) {
    for (let attempt = 0; attempt < 5; attempt++) {
      await cdp('Runtime.evaluate', { expression: `(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(clickText)})); b?.click(); })()` });
      await sleep(1200);
      const ok = await cdp('Runtime.evaluate', { expression: `document.body.innerText.includes(${JSON.stringify(marker)})`, returnByValue: true });
      if (ok.result?.result?.value) break;
    }
    await sleep(500);
  }
  // scroll the section into view for a clean capture
  await cdp('Runtime.evaluate', { expression: `window.scrollTo(0,0)` });
  await sleep(300);
  const res = await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 72, captureBeyondViewport: false });
  fs.writeFileSync(`${OUT}-${name}.jpeg`, Buffer.from(res.result.data, 'base64'));
  console.log('saved', `${OUT}-${name}.jpeg`);
};

await shoot('#orders', 'Medications', 'medications', 'Dispensed History');
await shoot('#orders', 'Labs', 'labs', 'Investigation Results');
await shoot('#orders', 'Scans', 'scans', 'Scan Results');
await shoot('#orders', 'Procedures', 'procedures', 'Procedure Results');
await shoot('#clinical', null, 'clinical', 'Diagnosis (ICD-10)');

ws.close();
chrome.kill();
