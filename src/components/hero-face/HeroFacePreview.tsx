import { useEffect, useRef, useState } from "react";
import type { FaceEngine } from "./engine";
import { createFollow, gazeMorphs, type Follow } from "./interaction/follow";
import { attachPointerFollow, type PointerFollow } from "./interaction/pointer-follow";
import type { Performer } from "./lipsync/idle";

// DEV-only live preview of the particle face inside the hero orb card: /?face=1.
// Idle: breathing, sway, blinks and an occasional soft closed-lip smile.
// ?face=1&talk=1 plays mimicked speech (no audio) of the site lines in a loop:
// &style=minimal|subtle|natural (default minimal), &lang=tr|en (default both).
// Cursor follow (on by default, &follow=0 turns it off): the pointer anywhere over the page turns her head in 3D
// and her eyes lead it (interaction/); mouse / pen only, touch and prefers-reduced-motion keep the idle life.
// The real island replaces this; nothing here ships.
const MESH_URL = "/dev-hero-face/mesh-f5s.json";
// ?face=1&look=<preset> previews another engine preset; unknown names fall back.
const DEFAULT_PRESET = "approved-v002";
const TALK_STYLES = ["minimal", "subtle", "natural"] as const;
// The voice UI (play button, circular labels, captions, call controls) stays
// hidden in the preview until real lip-sync lands.
const PREVIEW_CSS = `
  .orb-well[data-face-preview] div.z-20 { display: none !important; }
`;
// With the face, the call control must never sit on her face (a white disc + rotating text over it read as a horror
// film): a slim translucent pill at the bottom of the card with the button's own label (attr(aria-label), so it follows
// the language and the call state), no rotating badge / ring caption, status and errors above the pill.
const FACE_UI_CSS = `
  .orb-well[data-face-preview] div.z-20:has(> button) { align-items: flex-end; padding-bottom: 28px; }
  .orb-well[data-face-preview] div.z-20:has(> button) > svg { display: none; }
  .orb-well[data-face-preview] div.z-20:has(> button) > button {
    width: auto; height: 44px; gap: 10px; padding: 0 20px 0 16px; border-radius: 999px;
    background: rgb(255 255 255 / 0.08); color: rgb(255 255 255 / 0.92);
    border: 1px solid rgb(255 255 255 / 0.18); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 30px rgb(0 0 0 / 0.35); transition: background 200ms ease, border-color 200ms ease;
  }
  .orb-well[data-face-preview] div.z-20:has(> button) > button:hover { background: rgb(255 255 255 / 0.14); border-color: rgb(255 255 255 / 0.3); }
  .orb-well[data-face-preview] div.z-20:has(> button) > button > svg { width: 14px; height: 14px; transform: none; }
  .orb-well[data-face-preview] div.z-20:has(> button) > button::after {
    content: attr(aria-label); font-family: var(--font-mono, ui-monospace, monospace); font-size: 11px;
    letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
  }
  .orb-well[data-face-preview] div.z-20 svg:not(button svg) { display: none; }
  .face-word {
    position: absolute; transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap;
    font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; letter-spacing: 0.12em;
    text-transform: uppercase; color: rgb(255 255 255 / 0.9); padding: 4px 9px; border-radius: 6px;
    background: rgb(0 0 0 / 0.62); border: 1px solid rgb(170 240 255 / 0.22);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 0 18px rgb(120 220 255 / 0.12);
    animation: face-word 3.2s ease-out forwards;
  }
  .face-word[data-who="you"] { color: rgb(255 226 190 / 0.92); border-color: rgb(255 200 140 / 0.3); box-shadow: 0 0 18px rgb(255 190 120 / 0.1); }
  @keyframes face-word {
    0% { opacity: 0; filter: blur(6px); transform: translate(-50%, -50%) translateY(6px); }
    12% { opacity: 1; filter: blur(0); transform: translate(-50%, -50%); }
    70% { opacity: 0.85; }
    100% { opacity: 0; filter: blur(3px); transform: translate(-50%, -50%) translateY(-10px); }
  }
  @media (prefers-reduced-motion: reduce) { .face-word { animation-duration: 2.4s; } }
  .orb-well[data-face-preview] div.z-20.bottom-6 { bottom: 88px; }
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
  return { sample: (t) => (voice.live && voice.analyser ? livePerf.sample(t) : base.sample(t)) };
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

// ?look=cine-* presets live in a separate engine copy (engine-cine/) while the
// main engine is still being fixed. The path is resolved at runtime so the
// preview keeps compiling before that folder exists; it falls back to ./engine.
async function loadEngine(look: string | null): Promise<EngineModule> {
  // ?look=orig-<preset>: the engine as it was at ~22:30 on 2026-09-24 (approved-v002 before the defect fixes)
  if (look?.startsWith("orig-")) return (await import("./engine-orig")) as unknown as EngineModule;
  if (look?.startsWith("woman") || look?.startsWith("planb") || look?.startsWith("cine") || look?.startsWith("harmony")) {
    const url = "/src/components/hero-face/engine-cine/index.ts";
    try {
      return (await import(/* @vite-ignore */ url)) as EngineModule;
    } catch (cause) {
      console.warn("[hero-face preview] engine-cine not available yet", cause);
    }
  }
  return import("./engine");
}

export function HeroFacePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enabled] = useState(
    // DEV default: the face is on (mesh planb, look woman-cine-glow); ?face=0 shows the old orb
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("face") !== "0",
  );
  const [error, setError] = useState<string | null>(null);
  const [live] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("live") === "1");
  const [label, setLabel] = useState<string>("");
  // what is being said drifts into the field around her (never over her face): the AI's words as she says them
  // (cool), the visitor's as their speech is recognised (warm), each on a dark chip so it reads over the dots
  const [words, setWords] = useState<{ key: number; text: string; x: number; y: number; who: "ai" | "you" }[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let key = 0, lastId = "", lastText = "", youId = "", youCount = 0;
    const timers: number[] = [];
    const place = () => {
      for (let i = 0; i < 12; i++) {
        const x = 8 + Math.random() * 84, y = 6 + Math.random() * 74;
        if (Math.hypot((x - 50) / 30, (y - 42) / 34) > 1) return { x, y };
      }
      return { x: Math.random() < 0.5 ? 14 : 86, y: 20 + Math.random() * 50 };
    };
    const show = (fresh: string[], who: "ai" | "you") => {
      for (const w of fresh.filter((x) => x.replace(/[^\p{L}\p{N}]/gu, "").length > 1)) {
        const k = ++key;
        setWords((ws) => [...ws.slice(-9), { key: k, text: w.replace(/[.,!?;:]+$/, ""), who, ...place() }]);
        timers.push(window.setTimeout(() => setWords((ws) => ws.filter((x) => x.key !== k)), 3300));
      }
    };
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail as { id: string; text: string; agent: boolean } | null;
      if (!d) return;
      if (d.agent) {
        // the agent appends to one stream per reply
        const prev = d.id === lastId ? lastText : "";
        lastId = d.id; lastText = d.text;
        // her voice plays behind the face's look-ahead delay: show the word as it is heard, not as it arrives
        const fresh = d.text.slice(prev.length).split(/\s+/);
        const delay = 1000 * ((window as { __faceLookahead?: number }).__faceLookahead ?? 0);
        if (delay > 0) timers.push(window.setTimeout(() => show(fresh, "ai"), delay));
        else show(fresh, "ai");
        return;
      }
      // speech recognition re-sends the whole sentence on every revision: show only the words past the last count
      const all = d.text.trim().split(/\s+/).filter(Boolean);
      if (d.id !== youId) { youId = d.id; youCount = 0; }
      if (all.length > youCount) { show(all.slice(youCount), "you"); youCount = all.length; }
    };
    window.addEventListener("face-transcript", on);
    return () => { window.removeEventListener("face-transcript", on); timers.forEach(clearTimeout); };
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;

    // Hide the orb's voice UI while the preview is up (styles below are
    // scoped to this attribute).
    const well = canvas.closest(".orb-well");
    well?.setAttribute("data-face-preview", "");

    let disposed = false;
    let raf = 0;
    let engine: FaceEngine | null = null;
    let observer: ResizeObserver | null = null;
    let follow: Follow | null = null;
    let pointer: PointerFollow | null = null;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("look") ?? "woman-cine-glow";
      const followOn = params.get("follow") !== "0";
      const [{ createFaceEngine, defaultFraming, loadLabMesh, PRESETS }, performer] = await Promise.all([
        loadEngine(requested),
        loadPerformer(params),
      ]);
      // ?mesh=<name> loads /dev-hero-face/mesh-<name>.json (alternative identities); default mesh-f5s
      const meshName = params.get("mesh") ?? "planb";
      const meshUrl = meshName && /^[\w-]+$/.test(meshName) ? `/dev-hero-face/mesh-${meshName}.json` : MESH_URL;
      // an unknown / not-yet-published mesh falls back to the default instead of breaking the preview
      const mesh = await loadLabMesh(meshUrl).catch((cause) => {
        if (meshUrl === MESH_URL) throw cause;
        console.warn(`[hero-face preview] mesh "${meshName}" not available, using the default`, cause);
        return loadLabMesh(MESH_URL);
      });
      if (disposed) return;
      const wanted = requested?.startsWith("orig-") ? requested.slice(5) : requested;
      const preset = wanted && wanted in PRESETS ? wanted : DEFAULT_PRESET;
      // dev label: which mesh / look is REALLY running (a missing preset silently fell back once and cost hours)
      setLabel(`${meshName ?? "f5s"} · ${requested?.startsWith("orig-") ? "orig-" : ""}${preset}${wanted && preset !== wanted ? `  (\"${wanted}\" not found)` : ""}`);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      // &L.<param>=<number or a,b,c> overrides single look params live (e.g. &L.dotFade=0)
      const overrides: Record<string, number | number[]> = {};
      for (const [k, v] of params.entries()) {
        if (!k.startsWith("L.")) continue;
        const nums = v.split(",").map(Number);
        if (nums.every((n) => Number.isFinite(n))) overrides[k.slice(2)] = nums.length > 1 ? nums : nums[0]!;
      }
      const face = createFaceEngine(canvas, { mesh, preset, seed: 1, pixelRatio: dpr, look: overrides as never });
      engine = face;
      const size = () => {
        const rect = canvas.getBoundingClientRect();
        face.resize(rect.width, rect.height, dpr);
      };
      size();
      observer = new ResizeObserver(size);
      observer.observe(canvas);

      // cursor follow: an additive head turn + the eight eyeLook morphs (absolute, every frame)
      follow = followOn ? createFollow() : null;
      // depth 0.45 (default 1): the pointer plane sits closer, so ordinary cursor moves turn her clearly (owner: the
      // turn felt like 10% of the posed stills)
      pointer = follow ? attachPointerFollow(follow, { canvas, origin: (w, h) => defaultFraming(w, h).origin, depth: 0.35 }) : null;

      const start = performance.now();
      let prev = start;
      const loop = () => {
        const now = performance.now();
        const t = (now - start) / 1000;
        // pose = the idle sway (+ tiny nods while talking); morphs are absolute
        // (every driven morph each frame: blinks, mouth, smile)
        const { pose, morphs, gaze } = performer.sample(t);
        (window as unknown as { __faceMorphs?: Record<string, number> }).__faceMorphs = morphs; // dev: lip-sync measurements
        if (follow && pointer) {
          pointer.update();
          // the eyes counter the performer's head motion only while following is allowed (touch / reduced
          // motion: the idle life exactly as without the follow)
          const on = pointer.enabled;
          const blink = Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0);
          const f = follow.step((now - prev) / 1000, now / 1000, { yaw: on ? pose.yaw : 0, pitch: on ? pose.pitch : 0, blink, gazeYaw: gaze?.yaw, gazePitch: gaze?.pitch });
          face.setPose({ ...pose, yaw: pose.yaw + f.yaw, pitch: pose.pitch + f.pitch });
          face.setMorphs({ ...morphs, ...f.morphs });
        } else {
          face.setPose(pose);
          face.setMorphs(gaze ? { ...morphs, ...gazeMorphs(gaze.yaw, gaze.pitch, Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0)) } : morphs);
        }
        prev = now;
        face.render(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })().catch((cause) => {
      console.error("[hero-face preview]", cause);
      setError(String(cause?.message ?? cause));
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      pointer?.detach();
      liveDetach?.();
      liveDetach = null;
      well?.removeAttribute("data-face-preview");
      engine?.dispose();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <style>{FACE_UI_CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-[15] block size-full bg-black"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[25] overflow-hidden">
        {words.map((w) => (
          <span key={w.key} className="face-word" data-who={w.who} style={{ left: `${w.x}%`, top: `${w.y}%` }}>{w.text}</span>
        ))}
      </div>
      {label && (
        <p className="pointer-events-none absolute top-3 left-3 z-30 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-white/70">
          {label}
        </p>
      )}
      {error && (
        <p className="absolute inset-x-4 top-4 z-30 rounded bg-black/80 p-2 font-mono text-xs text-red-300">
          face preview: {error}
        </p>
      )}
    </>
  );
}
