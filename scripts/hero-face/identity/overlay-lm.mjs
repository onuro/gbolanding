#!/usr/bin/env node
// Project a weight vector's LM68 (+extras) at ref-2 framing and write them as a pts json for refcrop.mjs.
// usage: node overlay-lm.mjs --weights w.json [--rest rest.json] --frame 995,717,824 --out pts.json [--col #ff0]
import fs from 'node:fs';
import * as ict from './ict.mjs';
import { subsetModel, pupilSets, camera, project } from './fitcore.mjs';
import { arg } from './util.mjs';

const w = ict.readWeights(arg('--weights'));
const rest = arg('--rest', '') ? JSON.parse(fs.readFileSync(arg('--rest'), 'utf8')).expr || {} : {};
const [ox, oy, Wpx] = arg('--frame', '995,717,824').split(',').map(Number);
const col = arg('--col', '#ffe000');
const full = ict.blend(w, rest);
const ps = pupilSets(full);
const vids = [...new Set([...ict.LM68, ...ps.flat()])];
const M = subsetModel(vids);
const X = M.eval(w, rest);
const pup = ps.map((s) => s.map((v) => M.idx.get(v)));
const cam = camera(1580, Wpx);
const pr = project(X, pup, cam);
const pts = ict.LM68.map((v, j) => { const k = M.idx.get(v); return [ox + pr.uv[k * 2], oy + pr.uv[k * 2 + 1], String(j), col]; });
fs.writeFileSync(arg('--out'), JSON.stringify(pts));
console.log('Wcm', pr.Wcm.toFixed(3), 'wrote', pts.length);
