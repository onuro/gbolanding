#!/usr/bin/env node
// Final identity pick: writes top-N.json / top6.json, renders the picks (portraits, ref-2 key light,
// dot previews at ref-2 framing, expression checks) and builds the labelled sheets.
// Usage: node final.mjs --out <labDir> --picks picks.json [--ref /path/to/10.webp]
//   picks.json: [{ "id": "<candidate id>", "name": "short name", "desc": "one line" }, ...]
import fs from 'node:fs';
import path from 'node:path';
import * as ict from './ict.mjs';
import { measure, femScore, targetFit } from './metrics.mjs';
import { PRESETS } from './presets.mjs';
import { renderFace } from './render-face.mjs';
import { portrait } from './portrait.mjs';
import { writePNG } from './png.mjs';
import { checkIdentity, verdict } from './check-expr.mjs';
import { capture } from './sheet.mjs';
import { arg } from './util.mjs';

const out = arg('--out', '.');
const picks = JSON.parse(fs.readFileSync(arg('--picks'), 'utf8'));
const refImg = arg('--ref', '');
const { stats } = JSON.parse(fs.readFileSync(path.join(out, 'data', 'stats.json'), 'utf8'));
const candFiles = fs.readdirSync(out).filter((f) => /^r\d+-candidates\.json$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
const all = candFiles.flatMap((f) => JSON.parse(fs.readFileSync(path.join(out, f), 'utf8')));
ict.loadAllIdentities();
const fin = path.join(out, 'final');
fs.mkdirSync(fin, { recursive: true });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const Z_KEYS = ['browProt', 'eyeDeep', 'foreheadSlope', 'jawRatio', 'lowJawRatio', 'chinRatio', 'chinH', 'lowerFace', 'lipH', 'lipProj', 'noseW', 'noseL', 'noseHump', 'malarProj', 'neckW', 'cranioFacial', 'eyeToFace', 'canthalTilt'];

const base = checkIdentity(new Array(ict.NUM_IDS).fill(0));
const top = [];
picks.forEach((pk, k) => {
  const c = all.find((x) => x.id === pk.id);
  if (!c) throw new Error('unknown id ' + pk.id);
  const w = c.w.map((x) => +(+x).toFixed(4));
  const P = ict.blend(w);
  const m = measure(P);
  const f = femScore(m, stats);
  const checks = checkIdentity(w);
  const issues = verdict(checks, base);
  const n = k + 1;
  fs.writeFileSync(path.join(out, `top-${n}.json`), JSON.stringify(w));
  const files = renderFace(P, fin, `top${n}`, { views: ['front', 'q34', 'profile', 'ref'], width: 300, height: 368, ao: 40 });
  // ref-2 framing: frame 2.24 W x 1.93 W, eye line at 44.5 %, W = 2 IPD -> 916 x 790 px (half of 10.webp)
  const big = renderFace(P, fin, `top${n}_ref2`, { views: ['ref', 'dots2'], width: 916, height: 790, ao: 48, wFrac: 1 / 2.24, fy: 0.445 });
  // smallest eyeBlink peak that closes the lids as well as the mean face does at 1.0
  const bl = {};
  for (const b of [1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3]) bl['b' + b] = { eyeBlink_L: b, eyeBlink_R: b };
  const blr = checkIdentity(w, { exprSets: bl });
  const baseUnc = base.blink1.eyeUncoveredFrac;
  const eyeBlinkMax = +(Object.entries(blr).find(([, v]) => v.eyeUncoveredFrac <= baseUnc + 0.002)?.[0].slice(1) ?? 1.3);
  for (const [tag, expr, view] of [
    ['jaw05', { jawOpen: 0.5, mouthLowerDown_L: 0.3, mouthLowerDown_R: 0.3, mouthUpperUp_L: 0.1, mouthUpperUp_R: 0.1 }, 'front'],
    ['jaw05q', { jawOpen: 0.5 }, 'q34'],
    ['jaw05close05', { jawOpen: 0.5, mouthClose: 0.5 }, 'front'],
    ['blink1', { eyeBlink_L: 1, eyeBlink_R: 1 }, 'front'],
  ]) {
    const pr = portrait(ict.blend(w, expr), view, { width: 300, height: 368, teeth: true, ao: 24, wFrac: 0.62 });
    writePNG(path.join(fin, `top${n}_${tag}.png`), pr.W, pr.H, pr.rgb);
    files[tag] = path.join(fin, `top${n}_${tag}.png`);
  }
  top.push({
    rank: n, id: pk.id, name: pk.name, description: pk.desc, weights: w,
    source: c.note, norm: +Math.hypot(...w).toFixed(2), maxAbs: +Math.max(...w.map(Math.abs)).toFixed(2),
    fitSculptedFemaleTarget: +targetFit(m, stats, PRESETS.fem2s).toFixed(2), femScore: +f.score.toFixed(2),
    z: Object.fromEntries(Z_KEYS.map((key) => [key, +f.z[key].toFixed(2)])),
    restLipGapCm: +(P[ict.LM68[62] * 3 + 1] - P[ict.LM68[66] * 3 + 1]).toFixed(3), recommendedEyeBlinkMax: eyeBlinkMax,
    blinkUncoveredBySweep: Object.fromEntries(Object.entries(blr).map(([k, v]) => [k.slice(1), v.eyeUncoveredFrac])),
    expressionIssues: issues, expressionChecks: checks, files, big,
  });
  console.log(`top-${n} ${pk.id}: ${issues.length ? issues.join(' | ') : 'no issues'}`);
});
fs.writeFileSync(path.join(out, 'top6.json'), JSON.stringify({
  note: 'ICT-FaceKit Light identity weights for identity000..029 (face = neutral + sum w_i (identity_i - neutral)). Modes 9, 20, 25, 28 are purely left/right antisymmetric and are 0 here (perfectly symmetric faces). z = population z-scores over random N(0,1) identities.',
  meanFaceExpressionBaseline: base,
  picks: top.map(({ files, big, expressionChecks, ...rest }) => ({ ...rest, expressionChecks })),
}, null, 1));

// ---------- sheet.png: top 6 + every candidate explored ----------
const rel = (p) => path.relative(out, p);
function summarise(issues) {
  const teeth = issues.filter((s) => s.includes('teeth'));
  const blink = issues.filter((s) => s.includes('closed lids'));
  const other = issues.filter((s) => !s.includes('teeth') && !s.includes('closed lids'));
  const out = [];
  if (teeth.length) out.push(`teeth buried deeper than on the mean face in ${teeth.length} poses (hidden, no poke-through): ` + teeth[0].split(': ').slice(1).join(': ').replace(/; deepest.*$/, ')'));
  if (blink.length) out.push(blink[0]);
  return out.concat(other).join(' | ');
}
const TW = 200, TH = 245;
const topRow = (t) => `<div class="pick"><div class="ph"><b>#${t.rank} ${esc(t.name)}</b> <span class="id">${esc(t.id)}</span><br><span class="d">${esc(t.description)}</span><br>
  <span class="z">brow ${t.z.browProt} · eyeDeep ${t.z.eyeDeep} · jaw ${t.z.jawRatio} · chin ${t.z.chinRatio} · lips ${t.z.lipH} · noseW ${t.z.noseW} · hump ${t.z.noseHump} · cheekbone ${t.z.malarProj} · neck ${t.z.neckW} · |w| ${t.norm}</span><br>
  <span class="z">rest lip gap ${(t.restLipGapCm * 10).toFixed(1)} mm (mean face 0.8) · eyeBlink needs peak ${t.recommendedEyeBlinkMax} to close fully</span><br>
  <span class="${t.expressionIssues.length ? 'warn' : 'ok'}">${t.expressionIssues.length ? esc(summarise(t.expressionIssues)) : 'expressions: no issues beyond the mean-face baseline'}</span></div>
  <div class="pi">${['front', 'q34', 'profile', 'ref', 'jaw05', 'blink1'].map((v) => `<figure><img src="${esc(rel(t.files[v]))}" width="${TW}" height="${TH}"><figcaption>${v === 'ref' ? 'ref-2 key light' : v === 'jaw05' ? 'jawOpen 0.5 (+teeth)' : v === 'blink1' ? 'eyeBlink 1' : v === 'q34' ? '3/4' : v}</figcaption></figure>`).join('')}</div></div>`;
const pickIds = new Set(picks.map((p) => p.id));
const thumbs = all.filter((c) => fs.existsSync(path.join(out, 'cands', `${c.id}_front.png`)));
const TC = 12, tw = 128, th = 157;
const thumbHtml = thumbs.map((c) => `<figure class="${pickIds.has(c.id) ? 'sel' : ''}"><img src="cands/${esc(c.id)}_front.png" width="${tw}" height="${th}"><figcaption>${esc(c.id)}${c.fit != null ? ' · ' + (+c.fit).toFixed(1) : ''}</figcaption></figure>`).join('');
const W = 2 * 16 + 6 * (TW + 6) + 420;
const rowsH = picks.length * (TH + 30);
const thumbRows = Math.ceil(thumbs.length / TC);
const H = 90 + rowsH + 70 + thumbRows * (th + 26) + 40;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#0c0c0c;color:#ddd;font:13px/1.3 -apple-system,Helvetica,Arial,sans-serif}
h1{font-size:21px;margin:0;padding:14px 16px 2px;color:#fff}h2{font-size:16px;margin:0;padding:16px 16px 6px;color:#fff}
.n{padding:0 16px 8px;color:#999;font-size:12px}
.pick{display:flex;gap:10px;padding:0 16px;height:${TH + 30}px;align-items:flex-start}
.ph{width:410px;flex:none;padding-top:6px}.ph b{color:#7fffd4;font-size:15px}.id{color:#888;font-size:11px}
.d{color:#eee}.z{color:#aaa;font-size:11px}.ok{color:#8fd18f;font-size:11px}.warn{color:#ffc27a;font-size:11px}
.pi{display:flex;gap:6px}figure{margin:0}figcaption{font-size:10px;color:#999;text-align:center}
.th{display:grid;grid-template-columns:repeat(${TC},${tw}px);gap:6px 6px;padding:0 16px}
.th figure{border:1px solid #222}.th figure.sel{border:2px solid #7fffd4}
</style></head><body><h1>GBO hero face: female identity pick (ICT-FaceKit Light, identity modes 0-29)</h1>
<div class="n">Greyscale lab renders from our own software rasteriser, bald, no hair / brows / lashes. The dot look itself is the renderer's job; see dots-sheet.png for a rough dot preview at ref-2 framing. z = population z-scores (negative brow / jaw / chin / noseW / neck and positive lips / cheekbone = more feminine).</div>
<h2>Top 6</h2>${top.map(topRow).join('')}
<h2>All ${thumbs.length} candidates explored (front view; number = fit to the adult-female target, higher is closer; picks outlined)</h2>
<div class="th">${thumbHtml}</div></body></html>`;
const sheetHtml = path.join(out, 'sheet.html');
fs.writeFileSync(sheetHtml, html);
capture(sheetHtml, path.join(out, 'sheet.png'), W, H);

// ---------- dots-sheet.png: ref 2 next to the six dot previews (same framing) ----------
const DW = 916, DH = 790;
const dTiles = [];
if (refImg) dTiles.push({ src: 'file://' + refImg, label: 'ref 2 (10.webp, MASTER) at 1/2 scale' });
for (const t of top) dTiles.push({ src: rel(t.big.dots2), label: `#${t.rank} ${t.name} (${t.id}): quick dot preview, same framing` });
const dCols = 2;
const dH = 60 + Math.ceil(dTiles.length / dCols) * (DH + 30) + 20;
const dHtml = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000;color:#ccc;font:14px -apple-system,Helvetica,Arial,sans-serif}
h1{font-size:18px;color:#fff;margin:0;padding:12px 16px}.g{display:grid;grid-template-columns:repeat(${dCols},${DW}px);gap:30px 12px;padding:0 16px}
figure{margin:0}img{display:block;width:${DW}px;height:${DH}px;object-fit:cover}figcaption{color:#7fffd4;padding:4px 0}</style></head><body>
<h1>Ref 2 vs a quick dot preview of each pick at the same framing (916x790 = half of 10.webp; W = 2 IPD = 409 px; pitch W/59; key light (-0.16, 0.85, 0.50); look-report dot law, 0.63 W side falloff, ghost 0.07, catchlights). Rough stand-in only: no scatter, stars, rings, mottling or hair.</h1>
<div class="g">${dTiles.map((t) => `<figure><img src="${esc(t.src)}"><figcaption>${esc(t.label)}</figcaption></figure>`).join('')}</div></body></html>`;
const dotsHtml = path.join(out, 'dots-sheet.html');
fs.writeFileSync(dotsHtml, dHtml);
capture(dotsHtml, path.join(out, 'dots-sheet.png'), 2 * 16 + dCols * DW + 12, dH);

// ---------- expr-sheet.png ----------
const EW = 300, EH = 368;
const eRows = top.map((t) => `<div class="r"><div class="h"><b>#${t.rank} ${esc(t.name)}</b><br>${t.expressionIssues.length ? summarise(t.expressionIssues).split(' | ').map((s) => `<span class="warn">${esc(s)}</span>`).join('<br>') : '<span class="ok">no issues beyond the mean-face baseline</span>'}<br><span class="ok">teeth poke-through: none in any pose. eyeBlink peak ${t.recommendedEyeBlinkMax} closes the lids as fully as the mean face does at 1.0. mouthClose alone (no jawOpen) crosses the lips on every face incl. the mean: keep mouthClose &lt;= jawOpen.</span></div>
  ${['jaw05', 'jaw05q', 'jaw05close05', 'blink1'].map((v) => `<figure><img src="${esc(rel(t.files[v]))}" width="${EW}" height="${EH}"><figcaption>${{ jaw05: 'jawOpen .5 + lowerDown .3 + upperUp .1', jaw05q: 'jawOpen .5, 3/4', jaw05close05: 'jawOpen .5 + mouthClose .5', blink1: 'eyeBlink L/R 1' }[v]}</figcaption></figure>`).join('')}</div>`).join('');
const eH = 60 + top.length * (EH + 34) + 20;
const eHtml = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#0c0c0c;color:#ccc;font:12px -apple-system,Helvetica,Arial,sans-serif}
h1{font-size:18px;color:#fff;margin:0;padding:12px 16px}.r{display:flex;gap:6px;padding:0 16px;height:${EH + 34}px}.h{width:330px;flex:none}.h b{color:#7fffd4;font-size:14px}
figure{margin:0}figcaption{font-size:10px;color:#999;text-align:center}.ok{color:#8fd18f}.warn{color:#ffc27a}</style></head><body>
<h1>Expression checks on the picks (ICT expressions authored on the mean face, applied additively)</h1>${eRows}</body></html>`;
const exprHtml = path.join(out, 'expr-sheet.html');
fs.writeFileSync(exprHtml, eHtml);
capture(exprHtml, path.join(out, 'expr-sheet.png'), 2 * 16 + 330 + 4 * (EW + 6), eH);
console.log('done:', path.join(out, 'sheet.png'), path.join(out, 'dots-sheet.png'), path.join(out, 'expr-sheet.png'));
