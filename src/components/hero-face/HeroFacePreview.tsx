import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FaceEngine } from "./engine";
import type { TunePanelProps } from "./TunePanel";
import { createFollow, gazeMorphs, type Follow } from "./interaction/follow";
import { attachPointerFollow, type PointerFollow } from "./interaction/pointer-follow";
import { attachOrientationFollow, type OrientationFollow } from "./interaction/orientation-follow";
import type { Performer } from "./lipsync/idle";

// The particle face in the hero orb card (production and dev; ?face=0 shows the old orb, which also stays as the
// fallback when WebGL2 or the face fails). The dev switches below (?talk, ?look, ?mesh, ?L.*, ?tune, ?live) work in
// dev only.
// Idle: breathing, sway, blinks and an occasional soft closed-lip smile.
// ?face=1&talk=1 plays mimicked speech (no audio) of the site lines in a loop:
// &style=minimal|subtle|natural (default minimal), &lang=tr|en (default both).
// Cursor follow (on by default, &follow=0 turns it off): the pointer anywhere over the page turns her head in 3D
// and her eyes lead it (interaction/); on touch devices the phone's tilt aims her instead; prefers-reduced-motion keeps
// the idle life.
// the production mesh (scripts/hero-face/compact-mesh.mjs); dev: ?mesh=<name> loads /dev-hero-face/mesh-<name>.json and
// a missing production mesh falls back to the dev planb mesh
const FACE_MESH_URL = "/hero-face/face.json";
const DEV_MESH_URL = "/dev-hero-face/mesh-planb.json";
// ?face=1&look=<preset> previews another engine preset; unknown names fall back.
const DEFAULT_PRESET = "approved-v002";
const TALK_STYLES = ["minimal", "subtle", "natural"] as const;
// The voice UI (play button, circular labels, captions, call controls) stays
// hidden in the preview until real lip-sync lands.
const PREVIEW_CSS = `
  .orb-well[data-face-preview] div.z-20 { display: none !important; }
`;
// the space between two words on the line: a mono space at 13 px with the 0.08 em tracking
const WORD_GAP = 8;
// With the face, the call control must never sit on her face (a white disc + rotating text over it read as a horror
// film): one white pill at the bottom centre of the card that carries the whole call. Its contents morph as the call
// moves on (talk, connecting, end the call); no rotating badge / ring caption, status and errors sit above it.
const FACE_UI_CSS = `
  /* Keep the luminous face on the dark well in both themes. Screen blending matches the dark page
     background without picking up the old orb underneath the isolated surface. */
  .face-canvas { mix-blend-mode: screen; }
  /* the pill's bottom edge above the card's bottom: on wide screens (xl, the hero's two columns side by side) its centre
     is level with the left column's buttons (48 px column padding + half a 44 px button - the card's 12 px inset) */
  .orb-well[data-face-preview] { --call-y: 28px; }
  @media (min-width: 80rem) { .orb-well[data-face-preview] { --call-y: 36px; } }
  /* (only the idle container, inset-0: the call row, bottom-6, is a column and flex-end pushed its pill to the right) */
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) { align-items: flex-end; padding-bottom: var(--call-y); }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > svg { display: none; }
  /* One pill for the whole call (the owner, 2026-10-10): the idle button keeps its place and morphs its own contents as
     the call moves on, the play mark and "talk to our AI" first, then a spinner and "connecting", then a stop disc and
     "end the call", lifting 38 px into the room the spoken line leaves. VoiceButton glides its width between the three. */
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button {
    width: auto; height: 44px; border-radius: 999px; border: 0; gap: 10px; padding: 0 20px 0 16px;
    visibility: visible; opacity: 1; scale: 1; pointer-events: auto;
    background: rgb(255 255 255 / 0.94); color: rgb(9 9 11);
    box-shadow: 0 8px 30px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(255 255 255 / 0.25);
    transition: background-color 200ms ease, box-shadow 250ms ease, color 200ms ease, scale 300ms cubic-bezier(0.2, 0.8, 0.2, 1),
      translate 420ms cubic-bezier(0.2, 0.8, 0.2, 1), width 380ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button:hover {
    background: rgb(255 255 255); scale: 1.03; box-shadow: 0 10px 34px rgb(0 0 0 / 0.45), 0 0 26px rgb(255 255 255 / 0.2);
  }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button:active { scale: 0.97; transition-duration: 120ms; }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button[data-state="connecting"] { cursor: progress; }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button[data-state="live"] {
    gap: 12px; padding: 0 6px 0 20px; translate: 0 -38px;
  }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button > svg { width: 14px; height: 14px; transform: none; }
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button[data-state="connecting"] > svg,
  .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button[data-state="live"] > svg { display: none; }
  .orb-well[data-face-preview] .cta-face {
    display: flex; align-items: center; gap: 10px; animation: cta-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  }
  .orb-well[data-face-preview] button[data-state="live"] > .cta-face { gap: 12px; }
  .orb-well[data-face-preview] .cta-label {
    font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif); font-size: 14px; font-weight: 400;
    letter-spacing: 0; white-space: nowrap; color: rgb(9 9 11);
  }
  .orb-well[data-face-preview] .cta-ring {
    width: 14px; height: 14px; border-radius: 999px; border: 2px solid rgb(9 9 11 / 0.2); border-top-color: rgb(9 9 11);
    animation: cta-spin 800ms linear infinite;
  }
  .orb-well[data-face-preview] .cta-disc {
    display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 999px;
    background: rgb(12 14 18); color: rgb(255 255 255); transition: background-color 200ms ease;
  }
  .orb-well[data-face-preview] button[data-state="live"]:hover .cta-disc { background: rgb(44 48 54); }
  @keyframes cta-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes cta-spin { to { transform: rotate(360deg); } }
  /* the end-call pill below the orb is the card's own pill now, morphed above: hidden in the card */
  .orb-well[data-face-preview] div.z-20.bottom-6 > button.group { display: none; }
  .orb-well[data-face-preview] div.z-20 svg:not(button svg) { display: none; }
  /* the spoken words run along the bottom of the card as one line, like a sentence: hers and yours alike, plain white
     text, no bubbles (the owner, 2026-10-10), faded at both ends. The line is a viewport; the track inside it centres
     while the sentence is short and slides to keep the newest word in view once it runs past the fades. */
  .face-line {
    position: absolute; left: 0; right: 0; bottom: var(--call-y); height: 24px; overflow: hidden; pointer-events: none;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 36px, #000 calc(100% - 36px), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 36px, #000 calc(100% - 36px), transparent 100%);
  }
  /* the track is only a carrier: a spring in the script moves it along the line, and each word is placed on it by its
     own left (set when the word arrives), so one word leaving never moves another */
  .face-track {
    position: absolute; left: 0; top: 0; width: 0; height: 24px;
  }
  /* each word lives 2.65 s: it rises 6 px out of a 4 px blur over the first 0.3 s, holds sharp, and lifts 6 px away into
     the blur over the last 0.27 s (the 2026-09-26 motion). It is removed when this animation ends, so it leaves faded */
  .face-word {
    position: absolute; top: 2px; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: 13px;
    line-height: 20px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgb(255 255 255 / 0.96);
    animation: face-word-life 2.65s forwards;
  }
  @keyframes face-word-life {
    0% { opacity: 0; filter: blur(4px); transform: translateY(6px); animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1); }
    11.3% { opacity: 1; filter: blur(0); transform: translateY(0); animation-timing-function: linear; }
    90% { opacity: 1; filter: blur(0); transform: translateY(0); animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6); }
    100% { opacity: 0; filter: blur(4px); transform: translateY(-6px); }
  }
  @keyframes face-word-fade {
    0% { opacity: 0; }
    11.3% { opacity: 1; }
    90% { opacity: 1; }
    100% { opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .face-word { animation-name: face-word-fade; }
    .orb-well[data-face-preview] div.z-20.inset-0:has(> button) > button,
    .orb-well[data-face-preview] div.z-20.bottom-6 { transition: none; }
    .orb-well[data-face-preview] .cta-face { animation: none; }
  }
  /* status / errors sit above the call's pill, and lift with it when the call is live (the pill rises 38 px into the room
     the spoken line leaves); the small-screen idle label under the orb is dropped: the pill carries it */
  .orb-well[data-face-preview] div.z-20.bottom-6 { bottom: calc(var(--call-y) + 56px); transition: bottom 420ms cubic-bezier(0.2, 0.8, 0.2, 1); }
  .orb-well[data-face-preview]:has(button[data-state="live"]) div.z-20.bottom-6 { bottom: calc(var(--call-y) + 94px); }
  .orb-well[data-face-preview] div.z-20.bottom-6 > p:not([role]) { display: none; }
`;

// Idle life for every ?face=1 mode; the lip-sync driver (G2P, coarticulation)
// is only loaded in talk mode. Neither calls engine.setVoice, so the old
// amplitude driver never moves the mouth.
let liveDetach: (() => void) | null = null;

async function loadPerformer(params: URLSearchParams): Promise<Performer> {
  // a real call drives her on every link: while a call is live (orb-live) the AI voice moves the mouth (the agent
  // analyser from VoiceButton, else orb-level as it drove the orb); otherwise the idle / mimic-talk performer below
  const { createLivePerformer, listenFaceVoice } = await import("./lipsync/live");
  const { voice, detach } = listenFaceVoice();
  liveDetach = detach;
  const livePerf = createLivePerformer(voice);
  const base = await loadBasePerformer(params);
  if (params.get("live") === "1") return livePerf;
  // the live mouth only takes over while real agent audio exists (with ?talk=1 the dev mimic also announces orb-live)
  // (a throw in the live lip-sync falls back to the idle life for that frame instead of stopping the frame loop: one
  // uncaught error froze the face mid-call)
  let lastErr = 0;
  return {
    sample: (t) => {
      if (!(voice.live && voice.analyser)) return base.sample(t);
      try { return livePerf.sample(t); } catch (cause) {
        if (performance.now() - lastErr > 5000) { lastErr = performance.now(); console.error("[hero-face] live lip-sync frame failed", cause); }
        return base.sample(t);
      }
    },
  };
}

async function loadBasePerformer(params: URLSearchParams): Promise<Performer> {
  const talk = params.has("talk") && params.get("talk") !== "0";
  if (!talk) {
    const { createIdlePerformer } = await import("./lipsync/idle");
    return createIdlePerformer();
  }
  const { createPerformer } = await import("./lipsync");
  const s = params.get("style");
  const style = TALK_STYLES.find((name) => name === s) ?? "minimal";
  const l = params.get("lang");
  const lang = l === "tr" || l === "en" ? l : "both";
  return createPerformer({ mode: "talk", style, lang });
}

type EngineModule = typeof import("./engine");
// a fetch that reports a .bin body's download progress (bytes so far, total: content-length, else the compact mesh's
// ~2.9 MB); json and other responses pass through untouched
function progressFetch(onBytes: (got: number, total: number) => void): typeof fetch {
  return async (input, init) => {
    const res = await fetch(input, init);
    if (!res.ok || !res.body || !String(input).split("?")[0]!.endsWith(".bin")) return res;
    const total = Number(res.headers.get("content-length")) || 2.9e6;
    let got = 0;
    const body = res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) { got += chunk.byteLength; onBytes(got, total); ctl.enqueue(chunk); },
    }));
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  };
}
// the intro API of engine-cine (the other engines have none)
type IntroApi = { playIntro(opts?: { hold?: boolean }): void; introProgress(): number };
// the head pose toward rest by w (0 = at rest, 1 = as given)
function scalePose<P extends object>(p: P, w: number): P {
  const q = { ...p } as Record<string, unknown>;
  for (const k of ["yaw", "pitch", "roll", "x", "y", "z"]) if (typeof q[k] === "number") q[k] = (q[k] as number) * w;
  return q as P;
}

// dev only, temporary: /?tune=1 opens live sliders over the look params (TunePanel); its "hold the head still"
// switch drops the cursor follow so the pointer on the panel does not turn her
const TunePanel = lazy(() => import("./TunePanel"));
let holdHead = false;
const setHoldHead = (hold: boolean) => { holdHead = hold; };

// the face runs on engine-cine; dev only: ?look=orig-<preset> (the engine as it was at ~22:30 on 2026-09-24,
// approved-v002 before the defect fixes) and the older looks on ./engine (both folded out of production builds)
async function loadEngine(look: string): Promise<EngineModule> {
  if (import.meta.env.DEV) {
    if (look.startsWith("orig-")) return (await import("./engine-orig")) as unknown as EngineModule;
    if (!["woman", "planb", "cine", "harmony"].some((k) => look.startsWith(k))) return import("./engine");
  }
  return (await import("./engine-cine")) as unknown as EngineModule;
}

export function HeroFacePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled] = useState(
    // the face is on (look woman-cine-glow); ?face=0 and browsers without WebGL2 keep the old orb (as the page's inline
    // script decided before first paint)
    () => typeof window !== "undefined" && "WebGL2RenderingContext" in window && new URLSearchParams(window.location.search).get("face") !== "0",
  );
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [live] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("live") === "1");
  const [tune, setTune] = useState<Omit<TunePanelProps, "onHold"> | null>(null);
  // what is being said runs along the bottom of the card as one line (see .face-line): the AI's words as she says them
  // and the visitor's as their speech is recognised
  const [words, setWords] = useState<{ key: number; text: string; who: "ai" | "you" }[]>([]);
  const lineRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // a word leaves when its own animation has ended, so it is gone fully faded and nothing waits on a timer
  const retire = (key: number) => setWords((ws) => ws.filter((x) => x.key !== key));
  // The line rides on a spring. The track is pulled toward the place the line belongs, and it keeps its speed when that
  // place moves, so a word arriving mid-glide bends the motion instead of restarting it. The place: centred while the
  // sentence fits between the two fades; once it runs past them, the newest word sits EDGE px in from the right fade
  // and the older words run off the left. Reduced motion jumps.
  const spring = useRef({ x: 0, v: 0, target: 0, frame: 0, last: 0, placed: false });
  const lineTarget = () => {
    const box = lineRef.current, track = trackRef.current;
    if (!box || !track) return 0;
    const first = track.firstElementChild as HTMLElement | null, last = track.lastElementChild as HTMLElement | null;
    const L = first ? parseFloat(first.style.left) : 0;
    const R = last ? parseFloat(last.style.left) + last.getBoundingClientRect().width : 0;
    const W = box.clientWidth, EDGE = 44;
    return R - L <= W - 2 * EDGE ? (W - (R - L)) / 2 - L : W - EDGE - R;
  };
  const drawLine = (x: number) => {
    if (trackRef.current) trackRef.current.style.transform = `translateX(${x}px)`;
  };
  const stepLine = (now: number) => {
    const s = spring.current;
    const dt = s.last ? Math.min(0.033, (now - s.last) / 1000) : 1 / 60;
    const w = 11;
    s.last = now;
    s.v += (w * w * (s.target - s.x) - 2 * w * s.v) * dt;
    s.x += s.v * dt;
    drawLine(s.x);
    if (Math.abs(s.target - s.x) > 0.05 || Math.abs(s.v) > 0.05) {
      s.frame = requestAnimationFrame(stepLine);
    } else {
      s.x = s.target; s.v = 0; s.frame = 0; s.last = 0;
      drawLine(s.x);
    }
  };
  const moveLine = () => {
    const s = spring.current;
    s.target = lineTarget();
    if (!s.placed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      s.placed = true;
      cancelAnimationFrame(s.frame);
      s.frame = 0; s.x = s.target; s.v = 0;
      drawLine(s.x);
      return;
    }
    if (!s.frame) s.frame = requestAnimationFrame(stepLine);
  };
  // Each new word lands after the last one and keeps that place; the words already there do not move.
  useLayoutEffect(() => {
    const spans = Array.from(trackRef.current?.children ?? []) as HTMLElement[];
    let right: number | null = null;
    for (const span of spans) {
      if (!span.style.left) span.style.left = `${right === null ? 0 : right + WORD_GAP}px`;
      right = parseFloat(span.style.left) + span.getBoundingClientRect().width;
    }
    moveLine();
  }, [words]);
  useEffect(() => {
    const box = lineRef.current;
    if (!box) return;
    const observer = new ResizeObserver(moveLine);
    observer.observe(box);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(spring.current.frame);
      spring.current.frame = 0;
    };
  }, [enabled]);
  // ?fps=1 (production too, to test on a phone): frame rate, the slow-frame tail and the render scale, twice a second
  const fpsRef = useRef<HTMLParagraphElement>(null);
  const [showFps] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("fps") === "1");
  // phone diagnostics (production too): ?words=0 hides the spoken words, ?blend=0 drops the canvas' screen blend
  const [diag] = useState(() => {
    const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    return { words: q.get("words") !== "0", blend: q.get("blend") !== "0" };
  });
  useEffect(() => {
    if (!enabled) return;
    let key = 0, lastId = "", aiCount = 0, youId = "", youCount = 0;
    const timers: number[] = [];
    // each word is added at the end of the sentence and leaves when its own animation ends (see retire); the line sits
    // below her, so no word is drawn over her face
    const show = (fresh: string[], who: "ai" | "you") => {
      for (const w of fresh.filter((x) => x.replace(/[^\p{L}\p{N}]/gu, "").length > 1)) {
        const k = ++key;
        const text = w.replace(/[.,!?;:]+$/, "");
        setWords((ws) => [...ws, { key: k, text, who }]);
      }
    };
    // only whole words show: text arrives in chunks that can end mid-word, and speech recognition sends
    // interim guesses whose last word is still being spoken ('nel' / 'yap' of 'neler yapıyorsunuz' showed as words).
    // A word counts once whitespace follows it; the last one when its stream is done and settled (final, or a stream
    // with no final flag), or when the visitor's sentence has not changed for YOU_SETTLE_MS.
    const YOU_SETTLE_MS = 700;
    let youTimer = 0;
    const recentYou = new Map<string, number>();
    const whole = (text: string, last: boolean) => {
      const all = text.trim().split(/\s+/).filter(Boolean);
      return last || /\s$/.test(text) ? all : all.slice(0, -1);
    };
    const showYou = (ws: string[]) => {
      // a revision under a new segment id re-sends the same words: never the same word twice within 3 s
      const now = performance.now();
      const fresh = ws.filter((w) => { const k = w.toLocaleLowerCase("tr"); const seen = recentYou.get(k); recentYou.set(k, now); return !seen || now - seen > 3000; });
      if (fresh.length) show(fresh, "you");
    };
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { id: string; text: string; agent: boolean; final?: boolean; done?: boolean } | null;
      if (!d) return;
      const settled = !!d.done && d.final !== false;
      if (d.agent) {
        // the agent appends to one stream per reply: count its whole words
        if (d.id !== lastId) { lastId = d.id; aiCount = 0; }
        const all = whole(d.text, settled);
        const fresh = all.slice(aiCount);
        aiCount = Math.max(aiCount, all.length);
        if (!fresh.length) return;
        // her voice plays behind the face's look-ahead delay: show the word as it is heard, not as it arrives
        const delay = 1000 * ((window as { __faceLookahead?: number }).__faceLookahead ?? 0);
        if (delay > 0) timers.push(window.setTimeout(() => show(fresh, "ai"), delay));
        else show(fresh, "ai");
        return;
      }
      // speech recognition re-sends the whole sentence on every revision: show only whole words past the last count
      if (d.id !== youId) { youId = d.id; youCount = 0; }
      const all = whole(d.text, settled);
      if (all.length > youCount) { showYou(all.slice(youCount)); youCount = all.length; }
      window.clearTimeout(youTimer);
      const id = d.id, text = d.text;
      youTimer = window.setTimeout(() => {
        if (id !== youId) return;
        const done = whole(text, true);
        if (done.length > youCount) { showYou(done.slice(youCount)); youCount = done.length; }
      }, YOU_SETTLE_MS);
    };
    window.addEventListener("face-transcript", on);
    window.addEventListener("face-transcript-end", on);
    return () => {
      window.removeEventListener("face-transcript", on); window.removeEventListener("face-transcript-end", on);
      timers.forEach(clearTimeout); window.clearTimeout(youTimer);
    };
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;

    // Hide the orb's voice UI while the preview is up (styles below are
    // scoped to this attribute).
    const well = canvas.closest(".orb-well");
    well?.setAttribute("data-face-preview", "");
    // (the page marks the well before first paint and keeps the voice UI hidden until the face's CSS has styled it)
    well?.setAttribute("data-face-ready", "");

    let disposed = false;
    let raf = 0;
    let engine: FaceEngine | null = null;
    let observer: ResizeObserver | null = null;
    let follow: Follow | null = null;
    let pointer: PointerFollow | null = null;
    let tilt: OrientationFollow | null = null;
    let introSeen: IntersectionObserver | null = null;
    let inView: IntersectionObserver | null = null;
    let loadedTimer = 0;
    // the preloader's ring (HeroSection): 0 .. 1, never backwards; the modules, then the mesh download (most of the
    // wait), its decode, the engine, and her first frame
    const bar = well?.querySelector<SVGElement>(".face-preloader-bar");
    let shown = 0;
    const progress = (p: number) => {
      if (p <= shown) return;
      shown = Math.min(1, p);
      if (bar) bar.style.strokeDashoffset = String(100 - 97 * shown - 3);
    };
    progress(0.04);

    (async () => {
      // (the dev switches read an empty query in production)
      const params = new URLSearchParams(import.meta.env.DEV ? window.location.search : "");
      const query = new URLSearchParams(window.location.search);
      const requested = params.get("look") ?? "woman-cine-glow";
      const followOn = query.get("follow") !== "0";
      const [{ createFaceEngine, defaultFraming, loadLabMesh, PRESETS }, performer] = await Promise.all([
        loadEngine(requested),
        loadPerformer(params),
      ]);
      progress(0.15);
      const meshFetch = progressFetch((got, total) => progress(0.15 + 0.7 * Math.min(1, got / total)));
      // dev: ?mesh=<name> loads /dev-hero-face/mesh-<name>.json (alternative identities)
      const meshName = params.get("mesh");
      const meshUrl = meshName && /^[\w-]+$/.test(meshName) ? `/dev-hero-face/mesh-${meshName}.json` : FACE_MESH_URL;
      // (dev: an unknown / not-yet-published mesh falls back to the dev planb mesh instead of breaking the preview)
      const mesh = await loadLabMesh(meshUrl, meshFetch).catch((cause) => {
        if (!import.meta.env.DEV || meshUrl === DEV_MESH_URL) throw cause;
        console.warn(`[hero-face preview] mesh "${meshUrl}" not available, using ${DEV_MESH_URL}`, cause);
        return loadLabMesh(DEV_MESH_URL, meshFetch);
      });
      progress(0.9);
      if (disposed) return;
      const wanted = requested?.startsWith("orig-") ? requested.slice(5) : requested;
      const preset = wanted && wanted in PRESETS ? wanted : DEFAULT_PRESET;
      // (a missing preset silently fell back once and cost hours; the on-card label that showed it is gone)
      if (import.meta.env.DEV && wanted && preset !== wanted) console.warn(`[hero-face] look "${wanted}" not found, using ${preset}`);
      // phones (coarse pointer, small screen): 1.6x instead of 2x (0.64x the pixels for the dots and the glow pass) with
      // the dot pitch floor scaled along to preserve the spacing in CSS px, subject to pixel snapping, and the
      // engine's cheap bloom; on a slow GPU the glow pass was ~60 % of the frame and missed frames stuttered (halved the
      // frame time in the phone emulation). Desktop unchanged.
      // (?dpr=<0.1..3> forces the render scale, in production too, to try values on a phone; the dot pitch floor
      // follows it, so the dots stay the same in CSS px and only their sharpness changes)
      const forced = Math.min(3, Math.max(0, Number(query.get("dpr")) || 0));
      const phone = forced >= 0.1 || (window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820);
      const dpr = forced >= 0.1 ? forced : Math.min(phone ? 1.6 : 2, window.devicePixelRatio || 1);
      // &L.<param>=<number or a,b,c> overrides single look params live (e.g. &L.dotFade=0)
      const overrides: Record<string, number | number[]> = {};
      // (read from the real query, production too: look values can be tried on a phone)
      for (const [k, v] of query.entries()) {
        if (!k.startsWith("L.")) continue;
        const nums = v.split(",").map(Number);
        if (nums.every((n) => Number.isFinite(n))) overrides[k.slice(2)] = nums.length > 1 ? nums : nums[0]!;
      }
      if (phone) {
        const floor = (overrides.minPitchDevPx as number | undefined) ?? (PRESETS[preset] as { minPitchDevPx?: number }).minPitchDevPx ?? 5;
        overrides.minPitchDevPx = (floor * dpr) / 2;
      }
      const face = createFaceEngine(canvas, {
        mesh, preset, seed: 1, pixelRatio: dpr, look: overrides as never,
        // (phones: the DPR as given, not raised back to 2 for the pitch floor; cheap bloom)
        ...(phone ? { minPixelRatio: Math.min(1, dpr), lite: true } : {}),
      } as Parameters<typeof createFaceEngine>[1]);
      engine = face;
      progress(0.95);
      if (import.meta.env.DEV && params.get("tune") === "1") {
        setTune({ engine: face, base: PRESETS[preset] as unknown as Record<string, unknown>, initial: overrides, preset });
      }
      // the intro (engine-cine): armed dark at once (the first frames must not show her before it starts), played once
      // the card has come into view and the preloader is on its way out (her first frame is up); reduced motion and
      // ?intro=0 skip it to the finished face
      const intro = face as Partial<IntroApi>;
      let seen = false, loaded = false;
      const go = () => { if (seen && loaded) intro.playIntro?.(); };
      if (intro.playIntro && query.get("intro") !== "0" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        intro.playIntro({ hold: true });
        introSeen = new IntersectionObserver((es) => {
          if (!es.some((e) => e.isIntersecting)) return;
          seen = true;
          go();
          introSeen?.disconnect();
          introSeen = null;
        }, { threshold: 0.35 });
        introSeen.observe(canvas);
      }
      // her first frame: the ring fills, then (once it has visibly closed) the preloader blurs out and the intro's spark
      // lights in its place
      // ?prof=1 (production too): every 6 s, 20 frames timed pass by pass on this device: a 1-px readback before and
      // after each render call waits for the GPU, so each pass's time is its GPU time (the readbacks slow those frames)
      const profOn = query.get("prof") === "1";
      let profAt = 0, profText = "";
      const profile = () => {
        const r = (face as unknown as { renderer: { render: (s: unknown, c: unknown) => void; getContext: () => WebGL2RenderingContext; getRenderTarget: () => { width: number; height: number } | null } }).renderer;
        const gl = r.getContext(), orig = r.render.bind(r);
        const px = new Uint8Array(4), pxf = new Float32Array(4), pxh = new Uint16Array(4);
        const sync = () => {
          const f = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT), ty = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
          gl.readPixels(0, 0, 1, 1, f, ty, ty === gl.FLOAT ? pxf : ty === gl.HALF_FLOAT ? pxh : px);
        };
        const rows: { lab: string; ms: number }[][] = [];
        let seq: { lab: string; ms: number }[] = [];
        r.render = (sc: unknown, cam: unknown) => {
          const rt = r.getRenderTarget();
          sync(); const t0 = performance.now();
          orig(sc, cam);
          sync();
          seq.push({ lab: rt ? `${rt.width}x${rt.height}` : "out", ms: performance.now() - t0 });
          if (!rt) { rows.push(seq); seq = []; if (rows.length >= 20) { r.render = orig; report(); } }
        };
        const report = () => {
          const n = Math.max(...rows.map((x) => x.length)), med: string[] = [];
          for (let i = 0; i < n; i++) {
            const v = rows.map((x) => x[i]).filter(Boolean) as { lab: string; ms: number }[];
            const ms = v.map((x) => x.ms).sort((a, b) => a - b);
            med.push(`${v[0]!.lab} ${ms[Math.floor(ms.length / 2)]!.toFixed(1)}`);
          }
          profText = "gpu ms: " + med.join(" · ");
        };
      };
      let firstFrame = false;
      const frameMs: number[] = [], jsMs: number[] = [];
      let fpsAt = 0;
      const onFirstFrame = () => {
        progress(1);
        loadedTimer = window.setTimeout(() => {
          well?.setAttribute("data-face-loaded", "");
          loadedTimer = window.setTimeout(() => { loaded = true; go(); }, 150);
        }, 420);
      };
      const size = () => {
        const rect = canvas.getBoundingClientRect();
        face.resize(rect.width, rect.height, dpr);
      };
      size();
      observer = new ResizeObserver(size);
      observer.observe(canvas);
      // no frames while the card is scrolled out of view (the clocks tolerate the gap: every spring clamps its step)
      let visible = true;
      inView = new IntersectionObserver((es) => { visible = es.some((e) => e.isIntersecting); }, { threshold: 0 });
      inView.observe(canvas);

      // cursor follow: an additive head turn + the eight eyeLook morphs (absolute, every frame)
      follow = followOn ? createFollow() : null;
      // depth 0.45 (default 1): the pointer plane sits closer, so ordinary cursor moves turn her clearly (owner: the
      // turn felt like 10% of the posed stills)
      pointer = follow ? attachPointerFollow(follow, { canvas, origin: (w, h) => defaultFraming(w, h).origin, depth: 0.35 }) : null;
      // phones / tablets: the device's tilt aims her instead (interaction/orientation-follow.ts)
      tilt = follow && well ? attachOrientationFollow(follow, { card: well }) : null;

      const start = performance.now();
      let prev = start;
      let loopErr = 0;
      const loop = () => {
        // (the next frame is asked for first and the frame body is guarded: one throw skips one frame, never stops the
        // loop; an uncaught error in the live lip-sync froze the face mid-call)
        raf = requestAnimationFrame(loop);
        if (!visible) return;
        try {
          const now = performance.now();
          const prev0 = prev;
          const t = (now - start) / 1000;
          // pose = the idle sway (+ tiny nods while talking); morphs are absolute
          // (every driven morph each frame: blinks, mouth, smile)
          const js0 = performance.now();
          const { pose: pose0, morphs, gaze } = performer.sample(t);
          // she is still while she assembles; her life (sway, cursor follow) eases in over the intro's last 15 %
          const ip = intro.introProgress?.() ?? 1;
          const lx = Math.min(1, Math.max(0, (ip - 0.85) / 0.15)), lw = ip >= 1 ? 1 : lx * lx * (3 - 2 * lx);
          const pose = lw === 1 ? pose0 : scalePose(pose0, lw);
          if (import.meta.env.DEV) (window as unknown as { __faceMorphs?: Record<string, number> }).__faceMorphs = morphs; // dev: lip-sync measurements
          if (follow && pointer && !holdHead) {
            pointer.update();
            tilt?.update((now - prev) / 1000);
            // the eyes counter the performer's head motion only while following is allowed (touch / reduced
            // motion: the idle life exactly as without the follow)
            const on = pointer.enabled || !!tilt?.enabled;
            const blink = Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0);
            const f = follow.step((now - prev) / 1000, now / 1000, { yaw: on ? pose.yaw : 0, pitch: on ? pose.pitch : 0, blink, gazeYaw: gaze?.yaw, gazePitch: gaze?.pitch });
            if (import.meta.env.DEV) (window as unknown as { __faceFollow?: unknown }).__faceFollow = { yaw: f.yaw, pitch: f.pitch, eyeYaw: f.eyeYaw, eyePitch: f.eyePitch, tilt: !!tilt?.enabled }; // dev: follow measurements
            face.setPose({ ...pose, yaw: pose.yaw + lw * f.yaw, pitch: pose.pitch + lw * f.pitch });
            face.setMorphs({ ...morphs, ...(lw === 1 ? f.morphs : Object.fromEntries(Object.entries(f.morphs).map(([k, v]) => [k, v * lw]))) });
          } else {
            face.setPose(pose);
            face.setMorphs(gaze ? { ...morphs, ...gazeMorphs(gaze.yaw, gaze.pitch, Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0)) } : morphs);
          }
          prev = now;
          face.render(t);
          if (!firstFrame) { firstFrame = true; onFirstFrame(); }
          if (profOn && now - profAt > 6000 && firstFrame) { profAt = now; profile(); }
          if (fpsRef.current) {
            if (now - prev0 < 1000) frameMs.push(now - prev0);
            jsMs.push(performance.now() - js0);
            if (now - fpsAt > 500 && frameMs.length > 5) {
              const a = frameMs.splice(0).sort((x, y) => x - y);
              const avg = a.reduce((x, y) => x + y, 0) / a.length;
              // the face's own JS a frame (performer + lip-sync + follow + render calls): small while the fps is low means
              // the time goes elsewhere (the GPU, the page, the call)
              const j = jsMs.splice(0).sort((x, y) => x - y), jAvg = j.reduce((x, y) => x + y, 0) / Math.max(1, j.length);
              fpsRef.current.textContent = `${Math.round(1000 / avg)} fps · slow ${a[Math.floor(0.95 * (a.length - 1))]!.toFixed(0)} ms · worst ${a[a.length - 1]!.toFixed(0)} ms · face js ${jAvg.toFixed(1)} / ${(j[Math.floor(0.95 * (j.length - 1))] ?? 0).toFixed(1)} ms · ${dpr}x${diag.words ? "" : " · no words"}${diag.blend ? "" : " · no blend"}${profText ? "\n" + profText : ""}`;
              fpsAt = now;
            }
          }
        } catch (cause) {
          if (performance.now() - loopErr > 5000) { loopErr = performance.now(); console.error("[hero-face] frame failed", cause); }
        }
      };
      raf = requestAnimationFrame(loop);
    })().catch((cause) => {
      // no face (no WebGL2, the mesh failed to load, ...): the old orb comes back (its engine starts when the well loses
      // data-face-preview); dev also shows why
      console.error("[hero-face]", cause);
      cancelAnimationFrame(raf);
      engine?.dispose();
      engine = null;
      well?.removeAttribute("data-face-preview");
      well?.removeAttribute("data-face-ready");
      setFailed(true);
      if (import.meta.env.DEV) setError(String(cause?.message ?? cause));
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      introSeen?.disconnect();
      inView?.disconnect();
      window.clearTimeout(loadedTimer);
      well?.removeAttribute("data-face-loaded");
      pointer?.detach();
      tilt?.detach();
      liveDetach?.();
      liveDetach = null;
      well?.removeAttribute("data-face-preview");
      well?.removeAttribute("data-face-ready");
      engine?.dispose();
      setTune(null);
    };
  }, [enabled]);

  if (!enabled) return null;
  if (failed) return error ? <p className="absolute inset-x-4 top-4 z-30 rounded bg-black/80 p-2 font-mono text-xs text-red-300">face: {error}</p> : null;
  return (
    <>
      <style>{FACE_UI_CSS}</style>
      <div className="absolute inset-0 z-[15] isolate bg-background">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="face-canvas block size-full bg-black"
          style={diag.blend ? undefined : { mixBlendMode: "normal" }}
        />
      </div>
      <div ref={lineRef} aria-hidden="true" className="face-line z-[25]">
        <div ref={trackRef} className="face-track">
          {diag.words && words.map((w) => (
            <span key={w.key} className="face-word" data-who={w.who} onAnimationEnd={() => retire(w.key)}>{w.text}</span>
          ))}
        </div>
      </div>
      {showFps && (
        <p ref={fpsRef} className="pointer-events-none absolute top-3 left-3 right-3 z-30 whitespace-pre-wrap rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white/85" />
      )}
      {error && (
        <p className="absolute inset-x-4 top-4 z-30 rounded bg-black/80 p-2 font-mono text-xs text-red-300">
          face preview: {error}
        </p>
      )}
      {tune && (
        <Suspense fallback={null}>
          <TunePanel {...tune} onHold={setHoldHead} />
        </Suspense>
      )}
    </>
  );
}
