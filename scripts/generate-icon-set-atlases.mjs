/* Renders a finished complete-set atlas WebP for every built-in icon set, using
   the game's own resolvers so each sheet matches what the set looks like in
   play. Emoji sets need a real text stack to rasterise in colour, so the tiles
   are laid out as HTML and captured in headless Chrome.

   node scripts/generate-icon-set-atlases.mjs
   node scripts/generate-icon-set-atlases.mjs --review-emoji
   node scripts/generate-icon-set-atlases.mjs --review-marks */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import esbuild from 'esbuild';

const cwd = process.cwd();
const reviewEmoji = process.argv.includes('--review-emoji');
const reviewMarks = process.argv.includes('--review-marks');
if (reviewEmoji && reviewMarks) throw new Error('Choose only one review mode.');
const out = reviewEmoji
  ? path.join(cwd, 'src', 'assets', 'icon-atlas', 'review', 'emoji')
  : reviewMarks
    ? path.join(cwd, 'src', 'assets', 'icon-atlas', 'review', 'marks')
    : path.join(cwd, 'src', 'assets', 'icon-atlas', 'sets');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const debugPort = 9334;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/* ---------- resolve every set's artwork through the game's own code ----------
   The bundle has to sit inside the project so its bare react-dom import still
   resolves against node_modules. */
await mkdir(path.join(cwd, 'tmp'), { recursive: true });
const work = await mkdtemp(path.join(cwd, 'tmp', 'atlas-'));
const bundle = path.join(work, 'render.mjs');
await esbuild.build({
  entryPoints: [path.join(cwd, 'scripts', 'icon-atlas-render.jsx')],
  outfile: bundle, bundle: true, format: 'esm', platform: 'node',
  jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/server'],
  logLevel: 'warning',
});
const { SETS, REVIEW_SETS, COLUMNS, ROWS, TILE, SLOT_COUNT, GROUP_COUNTS } = await import(pathToFileURL(bundle).href);
const selectedSets = reviewEmoji ? REVIEW_SETS : SETS;
const width = COLUMNS * TILE;
const height = ROWS * TILE;

const page = (label, tiles) => `<!doctype html><html><head><meta charset="utf-8"><title>${label}</title><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  body { width: ${width}px; height: ${height}px; }
  .sheet { display: grid; grid-template-columns: repeat(${COLUMNS}, ${TILE}px);
    grid-auto-rows: ${TILE}px; width: ${width}px; height: ${height}px; }
  .tile { display: flex; align-items: center; justify-content: center;
    width: ${TILE}px; height: ${TILE}px; color: #f1eadc; }
  .tile.glyph { font-size: 82px; line-height: 1;
    font-family: "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif; }
  .tile.mark svg { width: 96px; height: 96px; display: block; }
</style></head><body><div class="sheet">${tiles.join('')}</div></body></html>`;

await mkdir(out, { recursive: true });
const pages = await Promise.all(selectedSets.map(async set => {
  const file = path.join(work, `${set.id}.html`);
  await writeFile(file, page(set.label, set.tiles));
  return { ...set, url: pathToFileURL(file).href };
}));

/* ---------- capture each sheet ---------- */
const profile = path.join(work, 'chrome-profile');
const chrome = spawn(chromePath, [
  /* Transparency comes from Emulation.setDefaultBackgroundColorOverride below;
     the --default-background-color flag wedges the renderer before it answers
     its first CDP command. */
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--force-device-scale-factor=1',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });
const chromeExited = new Promise(resolve => chrome.once('exit', resolve));

let ws;
try {
  for (let i = 0; ; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (r.ok) break; } catch { /* starting */ }
    if (i > 200) throw new Error('Timed out waiting for headless Chrome');
    await delay(100);
  }
  const created = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' });
  const target = await created.json();
  if (!target.webSocketDebuggerUrl) throw new Error(`No debugger target: ${JSON.stringify(target)}`);
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

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });

  for (const set of pages) {
    await send('Page.navigate', { url: set.url });
    await delay(350);
    const shot = await send('Page.captureScreenshot', {
      format: 'webp', quality: 92, fromSurface: true, captureBeyondViewport: false,
    });
    await writeFile(path.join(out, `${set.id}-icon-atlas.webp`), Buffer.from(shot.data, 'base64'));
    console.log(`  ${set.id.padEnd(10)} ${set.label}`);
  }
} finally {
  try { ws?.close(); } catch { /* already gone */ }
  if (chrome.exitCode == null) chrome.kill();
  await Promise.race([chromeExited, delay(3000)]);
  await rm(work, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}

const groups = Object.entries(GROUP_COUNTS).map(([group, count]) => `${group} ${count}`).join(', ');
console.log(`\nWrote ${pages.length} ${reviewEmoji || reviewMarks ? 'review sheets' : 'atlases'} (${SLOT_COUNT} slots: ${groups}) at ${width}x${height} to ${out}`);
