// Scratch CDP driver: real screenshots of the NHIS claim medicine card and picker. Deleted after use.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333;
const PROFILE = 'C:\\Users\\iMac\\AppData\\Local\\Temp\\qoder-cdp-meds';
const OUT_DIR = 'C:\\Users\\iMac\\Desktop\\hms\\veridian_hms\\.shots';
const CLAIM_ID = 'cmvzy7a2l0001w1roats0qgb6';

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--disable-popup-blocking',
  '--no-first-run',
  '--no-default-browser-check',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targets() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('chrome devtools never came up');
}

const ws = new WebSocket((await targets()).webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error('cdp websocket failed'));
});

let nextId = 1;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    return;
  }
  const waiter = pending.get(msg.id);
  if (waiter) { pending.delete(msg.id); waiter.resolve(msg); }
};

function send(method, params = {}, timeoutMs = 30000) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP call timed out: ${method}`)); }, timeoutMs);
    pending.set(id, {
      resolve: (msg) => {
        clearTimeout(timer);
        if (msg.error) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
        else resolve(msg.result);
      },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression, awaitPromise = true) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (result.exceptionDetails) throw new Error(`page script failed: ${JSON.stringify(result.exceptionDetails).slice(0, 400)}`);
  return result.result.value;
}

async function goto(url) {
  await send('Page.navigate', { url });
  await sleep(3500);
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
  writeFileSync(`${OUT_DIR}/${name}`, Buffer.from(data, 'base64'));
  console.log(`wrote ${name}`);
}

/** The teal ListSection header for medicines, whether it shows a count or the empty message. */
const HEADER_FINDER = `
  const header = (() => {
    const span = Array.from(document.querySelectorAll('span')).find(s =>
      /^(\\d+\\s+)?MEDICINES$/i.test(s.textContent.trim()) || /^NO MEDICINES ADDED/i.test(s.textContent.trim()));
    return span ? span.parentElement : null;
  })();
`;

await send('Page.enable');
await send('Runtime.enable');

await goto('http://localhost:3000/login');
const auth = await evaluate(`(async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const body = await res.json();
  const d = body.data || {};
  localStorage.setItem('auth_token', d.accessToken || d.token || '');
  localStorage.setItem('auth-storage', JSON.stringify({
    state: { user: d.user, token: d.accessToken || d.token, refreshToken: d.refreshToken || null, isInitialized: true },
    version: 0,
  }));
  return { role: d.user && d.user.role, hasToken: !!(d.accessToken || d.token) };
})()`);
console.log('login:', JSON.stringify(auth));

await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });

await goto(`http://localhost:3000/dashboard/insurance/claims/nhis/${CLAIM_ID}/edit`);
await sleep(3000);

// 1. Scroll the medicines card into frame and read what it now says.
const card = await evaluate(`(() => {
  ${HEADER_FINDER}
  if (!header) return { found: false };
  const addBtn = header.querySelector('button');
  if (addBtn) addBtn.setAttribute('data-shot-add-medicine', '1');
  header.scrollIntoView({ block: 'center' });
  const summary = Array.from(document.querySelectorAll('*')).find(el =>
    el.children.length === 0 && /^Medicines \\(\\d+\\)$/i.test(el.textContent.trim()));
  const hint = Array.from(document.querySelectorAll('p')).find(p => /(not claimable|cannot be claimed)/i.test(p.innerText || ''));
  return {
    found: true,
    header: header.innerText.replace(/\\n+/g, ' | ').trim(),
    addButton: addBtn ? addBtn.innerText.trim() : null,
    summaryLine: summary ? summary.textContent.trim() + ' | ' + ((summary.closest('div') || {}).innerText || '').replace(/\\n+/g, ' ').slice(0, 120) : null,
    hintBelow: hint ? hint.innerText.replace(/\\n+/g, ' ').slice(0, 400) : null,
    tableRows: header.parentElement
      ? Array.from(header.parentElement.querySelectorAll('tbody tr')).map(tr =>
          Array.from(tr.querySelectorAll('td')).map(td => td.innerText.replace(/\\n+/g, ' ').trim()).join(' | '))
      : [],
  };
})()`);
console.log('medicines card:', JSON.stringify(card, null, 2));
await sleep(400);
await shot('meds_card.jpg');

// 2. Open the Add Medicine picker and read what it offers.
const picker = await evaluate(`(async () => {
  ${HEADER_FINDER}
  const btn = header ? (header.querySelector('[data-shot-add-medicine]') || header.querySelector('button')) : null;
  if (!btn) return { opened: false, reason: 'no add button' };
  btn.click();
  await new Promise(r => setTimeout(r, 1000));
  const title = Array.from(document.querySelectorAll('h3')).find(h => /Add Medicine|Edit Medicine/i.test(h.textContent || ''));
  const box = title ? title.closest('.fixed') : null;
  return {
    opened: !!box,
    text: box ? box.innerText.replace(/\\n+/g, ' | ').slice(0, 700) : null,
    optionButtons: box ? Array.from(box.querySelectorAll('button')).map(b => b.innerText.replace(/\\n+/g, ' · ').trim())
                                          .filter(t => t.length > 4).slice(0, 12) : [],
  };
})()`);
console.log('picker:', JSON.stringify(picker, null, 2));
await shot('meds_picker.jpg');

ws.close();
chrome.kill();
process.exit(0);
