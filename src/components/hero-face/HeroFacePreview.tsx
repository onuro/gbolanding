import { useEffect, useRef, useState } from "react";
import type { FaceEngine } from "./engine";
import { createFollow, type Follow } from "./interaction/follow";
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

// Idle life for every ?face=1 mode; the lip-sync driver (G2P, coarticulation)
// is only loaded in talk mode. Neither calls engine.setVoice, so the old
// amplitude driver never moves the mouth.
async function loadPerformer(params: URLSearchParams): Promise<Performer> {
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
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("face"),
  );
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("");

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
      const requested = params.get("look");
      const followOn = params.get("follow") !== "0";
      const [{ createFaceEngine, defaultFraming, loadLabMesh, PRESETS }, performer] = await Promise.all([
        loadEngine(requested),
        loadPerformer(params),
      ]);
      // ?mesh=<name> loads /dev-hero-face/mesh-<name>.json (alternative identities); default mesh-f5s
      const meshName = params.get("mesh");
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
        const { pose, morphs } = performer.sample(t);
        if (follow && pointer) {
          pointer.update();
          // the eyes counter the performer's head motion only while following is allowed (touch / reduced
          // motion: the idle life exactly as without the follow)
          const on = pointer.enabled;
          const blink = Math.max(morphs.eyeBlinkLeft ?? 0, morphs.eyeBlinkRight ?? 0);
          const f = follow.step((now - prev) / 1000, now / 1000, { yaw: on ? pose.yaw : 0, pitch: on ? pose.pitch : 0, blink });
          face.setPose({ ...pose, yaw: pose.yaw + f.yaw, pitch: pose.pitch + f.pitch });
          face.setMorphs({ ...morphs, ...f.morphs });
        } else {
          face.setPose(pose);
          face.setMorphs(morphs);
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
      well?.removeAttribute("data-face-preview");
      engine?.dispose();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <style>{PREVIEW_CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 z-[15] block size-full bg-black"
      />
      {label && (
        <p className="pointer-events-none absolute bottom-3 left-3 z-30 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-white/70">
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
