// Headless Chrome capture over the DevTools protocol (no npm deps; Node >= 22 WebSocket + fetch).
// usage: node capture.mjs --url <url> --out <png> [--w 916 --h 790 --dpr 2] [--angle metal|swiftshader]
//        [--wait-expr "window.__ready===true"] [--canvas 1] [--timeout 60000] [--port 9333]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : '1']);
    return acc;
  }, []),
);
const url = args.url;
const out = resolve(args.out || 'capture.png');
const W = +(args.w || 916), H = +(args.h || 790), DPR = +(args.dpr || 2);
const angle = args.angle || 'metal';
const port = +(args.port || 9377);
const timeout = +(args.timeout || 90000);
const waitExpr = args['wait-expr'] || 'window.__ready===true';
const useCanvas = args.canvas !== '0';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const prof = args.prof || '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/fit/.chrome-prof-' + angle;
mkdirSync(prof, { recursive: true });

const flags = [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
  '--ignore-gpu-blocklist', '--enable-webgl', '--force-color-profile=srgb', `--window-size=${W},${H}`,
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
];
if (angle === 'swiftshader') flags.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
else flags.push(`--use-angle=${angle}`);
const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
chrome.stderr.on('data', (d) => { stderr += d; });
const kill = () => { try { chrome.kill('SIGKILL'); } catch {} };
process.on('exit', kill);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let ver;
  for (let i = 0; i < 100; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await sleep(100); }
  }
  if (!ver) throw new Error('chrome did not start\n' + stderr);
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const logs = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method === 'Runtime.consoleAPICalled') logs.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Runtime.enable'); await s('Page.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  await s('Page.navigate', { url });
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < timeout) {
    const r = await s('Runtime.evaluate', { expression: `(()=>{try{return !!(${waitExpr})}catch(e){return false}})()`, returnByValue: true });
    if (r.result.value) { ok = true; break; }
    const e = await s('Runtime.evaluate', { expression: 'window.__error||""', returnByValue: true });
    if (e.result.value) { logs.push('PAGE ERROR: ' + e.result.value); break; }
    await sleep(150);
  }
  const info = await s('Runtime.evaluate', { expression: 'JSON.stringify(window.__info||{})', returnByValue: true });
  let b64;
  if (ok && useCanvas) {
    const r = await s('Runtime.evaluate', { expression: 'window.__capture ? window.__capture() : ""', returnByValue: true, awaitPromise: true });
    b64 = (r.result.value || '').replace(/^data:image\/png;base64,/, '');
  }
  if (ok && !b64) {
    const shot = await s('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    b64 = shot.data;
  }
  if (b64) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, Buffer.from(b64, 'base64')); }
  console.log(JSON.stringify({ ok, out: b64 ? out : null, ms: Date.now() - t0, info: JSON.parse(info.result.value || '{}'), logs }, null, 1));
  ws.close(); kill();
  process.exit(ok ? 0 : 2);
}
main().catch((e) => { console.error(e); kill(); process.exit(1); });
