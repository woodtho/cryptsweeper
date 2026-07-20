import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();
const out = path.join(cwd, 'listing-assets', 'google-play');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const appUrl = 'http://127.0.0.1:4174/';
const debugPort = 9333;
const profile = path.join(cwd, 'tmp', 'listing-chrome-profile');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(url, attempts = 100) {
  for (let i = 0; i < attempts; i += 1) {
    try { const r = await fetch(url); if (r.ok) return r; } catch { /* still starting */ }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

await rm(profile, { recursive: true, force: true });
const vite = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4174'],
  { cwd, stdio: 'ignore', windowsHide: true, shell: process.platform === 'win32' });
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });

let ws;
try {
  await waitFor(appUrl);
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' });
  const target = await created.json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitForSelector = async selector => {
    for (let i = 0; i < 100; i += 1) {
      if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
      await delay(100);
    }
    throw new Error(`Missing selector: ${selector}`);
  };
  const clickText = async text => {
    const clicked = await evaluate(`(() => {
      const wanted = ${JSON.stringify(text)};
      const node = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === wanted || el.textContent.includes(wanted));
      if (!node) return false; node.click(); return true;
    })()`);
    if (!clicked) throw new Error(`Missing button: ${text}`);
    await delay(700);
  };
  const setViewport = async ({ width, height, dpr, mobile }) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile, screenWidth: width, screenHeight: height });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
  };
  const reloadHome = async () => {
    await send('Page.navigate', { url: appUrl });
    await delay(900);
    await waitForSelector('.home-screen');
  };
  const openLab = async () => {
    await evaluate(`sessionStorage.setItem('cryptsweeper.testLab','unlocked'); location.reload()`);
    await delay(1000);
    await waitForSelector('.test-lab-action');
    await clickText('Test lab');
    await waitForSelector('.test-lab');
  };
  const launchTest = async text => {
    await reloadHome();
    await openLab();
    await clickText(text);
    if (await evaluate(`Boolean(document.querySelector('.cutscene-skip'))`)) await clickText('Skip');
    await delay(600);
  };
  const screenshot = async file => {
    await evaluate(`window.scrollTo(0,0)`);
    await delay(250);
    const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(result.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');

  const formFactors = [
    { name: 'phone', dir: 'phone', width: 360, height: 640, dpr: 3, mobile: true, all: true },
    { name: 'tablet-7', dir: 'tablet-7', width: 720, height: 1280, dpr: 1.5, mobile: true },
    { name: 'tablet-10', dir: 'tablet-10', width: 800, height: 1280, dpr: 2, mobile: true },
    { name: 'pc', dir: 'pc/screenshots', width: 1280, height: 720, dpr: 1.5, mobile: false },
    { name: 'chromebook', dir: 'chromebook', width: 1280, height: 720, dpr: 1.5, mobile: false },
  ];

  for (const form of formFactors) {
    await setViewport(form);
    const dir = path.join(out, form.dir);
    await reloadHome();
    await evaluate(`sessionStorage.removeItem('cryptsweeper.testLab'); location.reload()`);
    await delay(900);
    await waitForSelector('.home-screen');
    await screenshot(path.join(dir, '01-home.png'));

    await clickText('New run');
    await waitForSelector('.classcard:not([disabled])');
    await evaluate(`document.querySelector('.classcard:not([disabled])').click()`);
    await delay(900);
    if (form.all) await screenshot(path.join(dir, '02-opening-cutscene.png'));
    if (await evaluate(`Boolean(document.querySelector('.cutscene-skip'))`)) await clickText('Skip');
    await delay(600);
    await screenshot(path.join(dir, form.all ? '03-map.png' : '02-map.png'));

    await launchTest('Normal fight');
    await screenshot(path.join(dir, form.all ? '04-combat.png' : '03-combat.png'));

    await launchTest('Shop');
    await screenshot(path.join(dir, form.all ? '05-shop.png' : '04-shop.png'));

    if (form.all) {
      await launchTest('6×6 Mines');
      await screenshot(path.join(dir, '06-logic-puzzle.png'));

      await launchTest("The Rat's Three Doors");
      await screenshot(path.join(dir, '07-probability-event.png'));

      await reloadHome();
      await clickText('New run');
      await waitForSelector('.classcard:not([disabled])');
      await screenshot(path.join(dir, '08-choose-delver.png'));
    }
  }
} finally {
  try { ws?.close(); } catch { /* already closed */ }
  chrome.kill();
  vite.kill();
}
