import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { atlasSlots } from '../src/ui/iconSets.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/assets/icon-atlas');
const tile = 128;
const columns = 10;
const rows = 9;
const width = columns * tile;
const height = rows * tile;
const slots = atlasSlots('all');
const colors = { map: '#c9973b', enemy: '#df5043', interface: '#8b9db8', camp: '#64a476', item: '#a579cf' };
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const cells = Array.from({ length: columns * rows }, (_, index) => {
  const slot = slots[index];
  const x = (index % columns) * tile;
  const y = Math.floor(index / columns) * tile;
  if (!slot) return `<g id="unused-${index + 1}"><rect x="${x}" y="${y}" width="${tile}" height="${tile}" fill="#090a0d" stroke="#343946"/><text x="${x + 64}" y="${y + 68}" text-anchor="middle" fill="#596273" font-size="12">UNUSED</text></g>`;
  const color = colors[slot.domain];
  return `<g id="tile-${index + 1}-${slot.domain}-${slot.key}">
    <rect x="${x}" y="${y}" width="${tile}" height="${tile}" fill="#12151b" stroke="#4b5363"/>
    <rect x="${x + 8}" y="${y + 8}" width="${tile - 16}" height="${tile - 16}" fill="none" stroke="${color}" stroke-dasharray="4 4" opacity=".45"/>
    <rect x="${x}" y="${y}" width="${tile}" height="5" fill="${color}"/>
    <text x="${x + 9}" y="${y + 24}" fill="${color}" font-size="13" font-weight="700">${String(index + 1).padStart(2, '0')}</text>
    <text x="${x + 64}" y="${y + 61}" text-anchor="middle" fill="#f1eadc" font-size="12" font-weight="700">${esc(slot.domain.toUpperCase())}</text>
    <text x="${x + 64}" y="${y + 80}" text-anchor="middle" fill="#b7afa0" font-size="11">${esc(slot.key)}</text>
    <text x="${x + 64}" y="${y + 105}" text-anchor="middle" fill="#596273" font-size="9">DRAW OVER THIS TILE</text>
  </g>`;
}).join('\n');

const guide = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Cryptsweeper complete icon atlas template</title>
  <desc>10 columns by 9 rows, 128 pixels per tile. Tiles are ordered left to right, top to bottom.</desc>
  <g id="guide" font-family="Arial, sans-serif">${cells}</g>
</svg>\n`;
const blank = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <title>Cryptsweeper blank complete icon atlas</title>
  <desc>Transparent 10 by 9 atlas canvas. Each tile is 128 by 128 pixels.</desc>
  <g id="artwork">${slots.map((slot, index) => `<g id="tile-${index + 1}-${slot.domain}-${slot.key}"/>`).join('')}</g>
</svg>\n`;
const csv = ['tile,column,row,domain,key', ...slots.map((slot, index) => `${index + 1},${index % columns + 1},${Math.floor(index / columns) + 1},${slot.domain},${slot.key}`)].join('\n') + '\n';

await mkdir(out, { recursive: true });
await Promise.all([
  writeFile(resolve(out, 'complete-icon-atlas-guide.svg'), guide),
  writeFile(resolve(out, 'complete-icon-atlas-blank.svg'), blank),
  writeFile(resolve(out, 'complete-icon-atlas-manifest.csv'), csv),
]);
console.log(`Generated ${slots.length} slots at ${width}x${height} in ${out}`);
