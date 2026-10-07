#!/usr/bin/env node
// Renders a still of the hero's particle face for the home page's share card:
// scripts/og/assets/hero-face.png, at twice the size of the card's picture cell.
//
//   node scripts/og/face-still.mjs [--look <preset>]
//
// Run it again only when the face itself changes (mesh or look). It bundles the
// site's own face engine (src/components/hero-face/engine-cine) with the esbuild
// that Astro already installs, into a temporary folder, opens it from disk in
// headless Chrome (WebGL on SwiftShader) and screenshots the canvas. The face is
// the production mesh (public/hero-face/face.json) in the production look
// (woman-cine-glow), at rest: no intro, no cursor follow, eyes open.
// Nothing is written to .vite or dist and the dev server is not involved.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const OUT = join(HERE, "assets/hero-face.png");
const ESBUILD = join(REPO, "node_modules/.bin/esbuild");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// The picture cell of template.html (1200 - 676 - 48 - 2 by 630 - 96 - 2), at 2x.
const CELL_W = 474;
const CELL_H = 532;
const SCALE = 2;
// Framing: face width as a share of the cell width, and the point between the
// pupils as shares of the cell. The hero card uses 0.41 of its height and an
// eye line at 39 %; the share card shows her a little closer.
const FACE_WIDTH = 0.5;
const ORIGIN = [0.5, 0.42];
// The production look (HeroFacePreview's default); --look tries another preset.
const lookArg = process.argv.indexOf("--look");
const LOOK = lookArg > 0 ? process.argv[lookArg + 1] : "woman-cine-glow";
const SETTLE_SECONDS = 4;

if (!existsSync(ESBUILD)) throw new Error(`esbuild not found at ${ESBUILD} (it comes with astro/vite: run npm install once)`);
if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}; set CHROME_PATH.`);

const work = mkdtempSync(join(tmpdir(), "og-face-"));
try {
  const engine = join(REPO, "src/components/hero-face/engine-cine/index.ts");
  const mesh = pathToFileURL(join(REPO, "public/hero-face/face.json")).href;
  writeFileSync(
    join(work, "main.ts"),
    `
import { createFaceEngine, loadLabMesh } from ${JSON.stringify(engine)};
// fetch() does not read file:// URLs; XHR does (with --allow-file-access-from-files).
const fileFetch = (url: string) =>
  new Promise<Response>((done, fail) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => done(new Response(xhr.response, { status: 200 }));
    xhr.onerror = () => fail(new Error("cannot read " + url));
    xhr.send();
  });
(async () => {
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  const W = ${CELL_W}, H = ${CELL_H};
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  const mesh = await loadLabMesh(${JSON.stringify(mesh)}, fileFetch as unknown as typeof fetch);
  const face = createFaceEngine(canvas, {
    mesh, preset: ${JSON.stringify(LOOK)}, seed: 1, pixelRatio: ${SCALE}, preserveDrawingBuffer: true,
    framing: (w: number, h: number) => ({ faceWidth: w * ${FACE_WIDTH}, origin: [w * ${ORIGIN[0]}, h * ${ORIGIN[1]}] }),
  } as Parameters<typeof createFaceEngine>[1]);
  face.resize(W, H, ${SCALE});
  face.skipIntro?.();
  let t = 0;
  for (let i = 0; i < ${SETTLE_SECONDS} * 30; i++) face.render((t += 1 / 30));
  document.title = "ready";
})().catch((e) => { document.title = "error"; document.body.textContent = String(e); });
`,
  );
  writeFileSync(
    join(work, "face.html"),
    `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style><canvas></canvas><script src="face.js"></script>`,
  );

  const built = spawnSync(
    ESBUILD,
    [join(work, "main.ts"), "--bundle", "--format=iife", "--target=es2022", `--outfile=${join(work, "face.js")}`, "--define:import.meta.env.DEV=false", "--log-level=warning"],
    { stdio: "inherit" },
  );
  if (built.status !== 0) throw new Error("esbuild failed");

  const started = Date.now();
  await new Promise((done, fail) => {
    const chrome = spawn(
      CHROME,
      [
        "--headless=new",
        "--hide-scrollbars",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--allow-file-access-from-files",
        `--force-device-scale-factor=${SCALE}`,
        `--window-size=${CELL_W},${CELL_H}`,
        `--user-data-dir=${join(work, "profile")}`,
        "--virtual-time-budget=15000",
        `--screenshot=${OUT}`,
        pathToFileURL(join(work, "face.html")).href,
      ],
      { stdio: "ignore" },
    );
    const timer = setTimeout(() => chrome.kill("SIGKILL"), 120_000);
    chrome.on("close", () => (clearTimeout(timer), done()));
    chrome.on("error", fail);
  });
  if (!existsSync(OUT) || statSync(OUT).mtimeMs < started - 1000) throw new Error("no screenshot");
  console.log(`✓ ${OUT.replace(`${REPO}/`, "")} (${Math.round(statSync(OUT).size / 1024)} KB)`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
