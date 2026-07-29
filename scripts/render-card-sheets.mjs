/* Render review PNGs from the game's live CardView and card catalog.
   Run with: npm run cards:render */
import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const out = path.join(cwd, 'review', 'card-sheets');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appUrl = 'http://127.0.0.1:4176/';
const debugPort = 9336;
const profile = path.join(cwd, 'tmp', `card-sheet-chrome-profile-${process.pid}`);
const sheets = [
  ['sapper', '01-sapper-card-sheet.png'],
  ['surveyor', '02-surveyor-card-sheet.png'],
  ['terraformer', '03-terraformer-card-sheet.png'],
  ['lamplighter', '04-lamplighter-card-sheet.png'],
  ['gambler', '05-gambler-card-sheet.png'],
  ['chirurgeon', '06-chirurgeon-card-sheet.png'],
  ['archivist', '07-archivist-card-sheet.png'],
  ['warden', '08-warden-card-sheet.png'],
  ['hexwright', '09-hexwright-card-sheet.png'],
  ['revenant', '10-revenant-card-sheet.png'],
  ['neutral-special', '11-neutral-special-card-sheet.png'],
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(url, attempts = 150) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // The preview server or browser is still starting.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function terminateTree(child) {
  if (!child || child.exitCode != null || child.signalCode != null) return Promise.resolve();
  if (process.platform === 'win32') {
    return new Promise(resolve => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('error', resolve);
      killer.once('exit', resolve);
    });
  }
  child.kill('SIGTERM');
  return Promise.resolve();
}

await mkdir(out, { recursive: true });
await mkdir(path.dirname(profile), { recursive: true });
await rm(profile, { recursive: true, force: true });

const vite = spawn(
  process.execPath,
  [path.join(cwd, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4176'],
  { cwd, stdio: 'ignore', windowsHide: true },
);
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--force-device-scale-factor=1',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

let ws;
try {
  await waitFor(appUrl);
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' });
  const target = await created.json();
  if (!target.webSocketDebuggerUrl) throw new Error('Headless Chrome did not expose a debugger target.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  const runtimeErrors = [];
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      runtimeErrors.push(
        message.params?.exceptionDetails?.exception?.description
        || message.params?.exceptionDetails?.text
        || 'Unknown runtime error',
      );
    }
    if (!message.id || !pending.has(message.id)) return;
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handlers.reject(new Error(message.error.message));
    else handlers.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitForSelector = async selector => {
    for (let i = 0; i < 200; i += 1) {
      if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
      await delay(100);
    }
    throw new Error(`Missing ${selector}${runtimeErrors.length ? `\n${runtimeErrors.join('\n')}` : ''}`);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1160,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1160,
    screenHeight: 900,
  });

  const manifest = [];
  for (const [sheetKey, filename] of sheets) {
    // Reset the viewport before measuring each document. Otherwise a shorter
    // sheet inherits the previous sheet's tall viewport as its minimum height.
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1160,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1160,
      screenHeight: 900,
    });
    const url = `${appUrl}?card-sheet=${encodeURIComponent(sheetKey)}`;
    await send('Page.navigate', { url });
    await waitForSelector('[data-card-sheet-ready="true"]');
    await evaluate('document.fonts.ready');
    await delay(150);
    const dimensions = await evaluate(`({
      width: Math.ceil(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)),
      height: Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))
    })`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: dimensions.width,
      height: dimensions.height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: dimensions.width,
      screenHeight: dimensions.height,
    });
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height, scale: 1 },
    });
    await writeFile(path.join(out, filename), Buffer.from(shot.data, 'base64'));
    manifest.push({ sheet: sheetKey, file: filename, width: dimensions.width, height: dimensions.height });
    console.log(`  ${sheetKey.padEnd(18)} ${dimensions.width}x${dimensions.height}`);
  }

  await writeFile(
    path.join(out, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), sheets: manifest }, null, 2)}\n`,
  );
  console.log(`\nWrote ${sheets.length} card sheets to ${out}`);
} finally {
  try { ws?.close(); } catch { /* already closed */ }
  await Promise.all([terminateTree(chrome), terminateTree(vite)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}

process.exit(0);
