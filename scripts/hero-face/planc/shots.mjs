// Plan C: batch headless-Chrome captures of the plan C lab (one Chrome, many pages / frames; no npm deps).
//   node shots.mjs --jobs jobs.json [--port 9433] [--w 916 --h 790 --dpr 2]
// jobs.json: { "base": "http://127.0.0.1:8932/lab/index.html?", "outDir": "/abs/dir",
//              "jobs": [ { "name": "rest", "q": "mesh=cute&..." },
//                        { "name": "talk", "q": "...", "frames": [ { "name": "jaw020", "spec": {"expr": {"jawOpen": 0.2}} } ] } ] }
// A job without frames writes <outDir>/<name>.png (window.__capture); with frames, each frame is rendered in the
// same page with window.__frame(spec) and written to <outDir>/<frame name>.png.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const J = JSON.parse(readFileSync(arg('jobs'), 'utf8'));
const W = +arg('w', 916), H = +arg('h', 790), DPR = +arg('dpr', 2);
const port = +arg('port', 9433);
const timeout = +arg('timeout', 60000);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const prof = '/private/tmp/claude-501/-Users-onuroztaskiran-FE-Apps-tt6-gbolanding/ec762eb5-0e84-43b6-a8c2-a6f1c54d7112/scratchpad/hero-face/planc/chrome-prof-render';
mkdirSync(prof, { recursive: true });
mkdirSync(J.outDir, { recursive: true });
const flags = [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
  '--ignore-gpu-blocklist', '--enable-webgl', '--force-color-profile=srgb', `--window-size=${W},${H}`,
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--use-angle=metal',
  '--disk-cache-size=1', '--aggressive-cache-discard',
];
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
  let id = 0; const pending = new Map(); let logs = [];
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
  await s('Runtime.enable'); await s('Page.enable'); await s('Network.enable');
  await s('Network.setCacheDisabled', { cacheDisabled: true });
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
  const report = [];
  for (const job of J.jobs) {
    logs = [];
    await s('Page.navigate', { url: J.base + job.q });
    const t0 = Date.now(); let ok = false;
    await sleep(100);
    while (Date.now() - t0 < timeout) {
      const r = await s('Runtime.evaluate', { expression: '(()=>{try{return window.__ready===true}catch(e){return false}})()', returnByValue: true });
      if (r.result.value) { ok = true; break; }
      const e = await s('Runtime.evaluate', { expression: 'window.__error||""', returnByValue: true });
      if (e.result.value) { logs.push('PAGE ERROR: ' + e.result.value); break; }
      await sleep(100);
    }
    if (!ok) { report.push({ job: job.name, ok, logs }); console.log(JSON.stringify({ job: job.name, ok, logs })); continue; }
    const shots = job.frames ? job.frames : [{ name: job.name }];
    for (const f of shots) {
      const expr = f.spec ? `window.__frame(${JSON.stringify(f.spec)})` : 'window.__capture()';
      const r = await s('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      const b64 = (r.result.value || '').replace(/^data:image\/png;base64,/, '');
      const out = join(J.outDir, f.name + '.png');
      writeFileSync(out, Buffer.from(b64, 'base64'));
    }
    const info = await s('Runtime.evaluate', { expression: 'JSON.stringify({p: window.__info && window.__info.pitchDev, W: window.__info && window.__info.faceWidthDev, n: window.__info && window.__info.particles})', returnByValue: true });
    report.push({ job: job.name, ok, ms: Date.now() - t0, info: JSON.parse(info.result.value), logs });
    console.log(JSON.stringify(report[report.length - 1]));
  }
  ws.close(); kill();
  process.exit(report.every((r) => r.ok) ? 0 : 2);
}
main().catch((e) => { console.error(e); kill(); process.exit(1); });
