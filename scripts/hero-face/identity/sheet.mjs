// Labelled contact sheets: writes an HTML grid next to the images and screenshots it with headless
// Chrome (file://, no server). Tiles: [{ imgs: [relative paths], label, sub }].
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function makeSheet({ dir, name, title, tiles, cols = 6, tileW = 300, tileH = 370, note = '' }) {
  const perTile = Math.max(...tiles.map((t) => t.imgs.length));
  const cellW = tileW * perTile + (perTile - 1) * 2;
  const labelH = 44;
  const rows = Math.ceil(tiles.length / cols);
  const headH = title ? 64 : 0;
  const W = cols * cellW + (cols + 1) * 10;
  const H = headH + rows * (tileH + labelH + 10) + 20;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#111;color:#ddd;font:13px/1.25 -apple-system,Helvetica,Arial,sans-serif}
  h1{font-size:20px;margin:0;padding:14px 12px 4px;color:#fff;font-weight:600}
  .n{padding:0 12px 8px;color:#999;font-size:12px}
  .g{display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:10px;padding:0 10px}
  .t{background:#000;border:1px solid #2a2a2a}
  .i{display:flex;gap:2px}.i img{width:${tileW}px;height:${tileH}px;display:block;object-fit:cover}
  .l{height:${labelH - 8}px;padding:4px 6px;overflow:hidden}
  .l b{color:#7fffd4;font-weight:600}.l span{color:#aaa;font-size:11px}
  </style></head><body>${title ? `<h1>${esc(title)}</h1><div class="n">${esc(note)}</div>` : ''}
  <div class="g">${tiles
    .map(
      (t) => `<div class="t"><div class="i">${t.imgs.map((s) => `<img src="${esc(s)}">`).join('')}</div>
      <div class="l"><b>${esc(t.label)}</b><br><span>${esc(t.sub || '')}</span></div></div>`,
    )
    .join('')}</div></body></html>`;
  const htmlPath = path.join(dir, `${name}.html`);
  fs.writeFileSync(htmlPath, html);
  const png = path.join(dir, `${name}.png`);
  capture(htmlPath, png, W, H);
  return png;
}

/** Screenshot an HTML file with headless Chrome at W x H (CSS px, scale 1). */
export function capture(htmlPath, png, W, H) {
  const prof = path.join(path.dirname(htmlPath), '.chrome-prof');
  // Headless Chrome writes the screenshot but sometimes never exits: poll for a stable file, then kill.
  if (fs.existsSync(png)) fs.unlinkSync(png);
  const child = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${prof}`, '--no-first-run',
    '--no-default-browser-check', '--allow-file-access-from-files', '--force-device-scale-factor=1',
    `--window-size=${W},${H}`, `--screenshot=${png}`, 'file://' + htmlPath,
  ], { stdio: 'ignore' });
  const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  let last = -1;
  for (let t = 0; t < 600; t++) {
    sleep(200);
    if (fs.existsSync(png)) {
      const sz = fs.statSync(png).size;
      if (sz > 0 && sz === last) break;
      last = sz;
    }
  }
  try { child.kill('SIGKILL'); } catch {}
  if (!fs.existsSync(png)) throw new Error('sheet screenshot failed: ' + png);
  return png;
}
