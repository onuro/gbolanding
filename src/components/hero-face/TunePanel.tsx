import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// DEV-only, temporary: live sliders over the face's look params (/?tune=1). Every change goes straight to
// engine.setLook and into the address bar as &L.<param>=..., so a reload or a copied link reproduces it.
type Val = number | number[];
type Look = Record<string, unknown>;
interface TuneEngine {
  setLook(look: Record<string, Val>): void;
  info(): Record<string, unknown>;
  /** the intro (engine-cine only) */
  playIntro?(): void;
}
export interface TunePanelProps {
  engine: TuneEngine;
  /** the preset's own values (no URL overrides): what "reset" goes back to */
  base: Look;
  /** the &L.* overrides the page was loaded with */
  initial: Record<string, Val>;
  /** the running preset (the Darkstar switch reloads with ?look=woman-darkstar or back) */
  preset: string;
  onHold(hold: boolean): void;
}

interface Knob {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  /** slider value for a look (1 = the preset for the x-scale knobs) */
  get(look: Look, base: Look): number;
  /** the look params a slider value sets (look = the current values, so one element of an array keeps the others) */
  set(v: number, base: Look, look: Look): Record<string, Val>;
  hint?: string;
}

const num = (l: Look, k: string) => (typeof l[k] === "number" ? (l[k] as number) : 0);
const arr = (l: Look, k: string) => (Array.isArray(l[k]) ? (l[k] as number[]) : []);
const abs = (id: string, label: string, min: number, max: number, step: number, hint?: string): Knob => ({
  id, label, min, max, step, hint, get: (l) => num(l, id), set: (v) => ({ [id]: v }),
});
// one x-factor over several radius params, so the dots shrink or grow together
const scale = (id: string, label: string, keys: string[], min: number, max: number, hint?: string): Knob => ({
  id, label, min, max, step: 0.01, hint,
  get: (l, b) => {
    const k = keys[0]!;
    const cur = Array.isArray(l[k]) ? arr(l, k)[0]! : num(l, k);
    const ref = Array.isArray(b[k]) ? arr(b, k)[0]! : num(b, k);
    return ref ? cur / ref : 1;
  },
  set: (v, b) => Object.fromEntries(keys.map((k) => [k, Array.isArray(b[k]) ? arr(b, k).map((x) => round(x * v)) : round(num(b, k) * v)])),
});
// one element of an array param (e.g. the vignette amount)
const elem = (id: string, label: string, key: string, i: number, min: number, max: number, step: number, hint?: string): Knob => ({
  id, label, min, max, step, hint,
  get: (l) => arr(l, key)[i] ?? 0,
  set: (v, _b, l) => ({ [key]: arr(l, key).map((x, j) => (j === i ? v : x)) }),
});
const round = (x: number) => Math.round(x * 10000) / 10000;

const GROUPS: { title: string; knobs: Knob[] }[] = [
  {
    title: "Dots",
    knobs: [
      abs("gridDiv", "Grid density (dots across the face)", 30, 130, 1, "dot size follows the grid: more dots = smaller dots"),
      abs("minPitchDevPx", "Min grid spacing (device px)", 2, 12, 1, "a floor: lower it to push the grid past ~90"),
      scale("faceDot", "Face dot size ×", ["rBase", "rMid", "rTop", "rMax"], 0.3, 1.6),
      scale("fieldDot", "Hair / field dot size ×", ["survivorSize"], 0.3, 1.6),
      abs("dimShrink", "Dim dots shrink", 0, 1, 0.01),
      abs("dotSoft", "Dot softness", 0, 1, 0.01),
    ],
  },
  {
    // (the lips read as two even bars when they are as bright as the skin end to end: shape comes from the corner
    // shadow, the Cupid's-bow ridge and a gloss spot on the lower lip)
    title: "Lips",
    knobs: [
      abs("lipFloor", "Lip tone (1 = as bright as skin)", 0.3, 1.2, 0.01),
      elem("lipRest", "Upper lip light at rest", "lipTalk", 0, 0, 0.4, 0.005),
      abs("lipBorder", "Cupid's bow ridge", 0, 1.5, 0.01),
      elem("glossGain", "Lower lip gloss", "lipGloss", 0, 0, 1.5, 0.01),
      elem("glossExp", "Gloss tightness (higher = smaller spot)", "lipGloss", 1, 5, 80, 1),
      elem("cornerDepth", "Mouth corner shadow", "lipCorner", 0, 0, 1.2, 0.01),
      elem("cornerR", "Corner shadow size", "lipCorner", 1, 0.005, 0.08, 0.001),
      elem("seamDepth", "Seam between the lips", "lipSeam", 2, 0, 1, 0.01),
    ],
  },
  {
    // (the speaking light comes on with any mouth motion or a live call and holds ~8 s after: tune these with
    // &talk=1 so she keeps talking)
    title: "Lips while speaking",
    knobs: [
      elem("talkUpper", "Upper lip light", "lipTalk", 1, 0, 1, 0.01),
      elem("talkLower", "Lower lip light", "lipTalk", 2, 0, 0.8, 0.01),
      elem("talkSeal", "Extra light on closed lips (m/b/p)", "lipTalk", 5, 0, 1, 0.01),
      elem("talkSeam", "Seam lift (1 = no line between the lips)", "lipTalk", 6, 0, 1, 0.01),
      elem("talkFade0", "Fade to corners: starts at", "lipTalkShape", 0, 0, 1.5, 0.01, "share of the way to the corner"),
      elem("talkFade1", "Fade to corners: gone at", "lipTalkShape", 1, 0.1, 2, 0.01),
    ],
  },
  {
    // (the Darkstar look's accents; on the default look they add amber to it)
    title: "Darkstar",
    knobs: [
      abs("hudRim", "Amber outline (heat rim)", 0, 1.5, 0.01),
      abs("hudVoice", "Amber speech heat (rings, field)", 0, 1.5, 0.01),
      abs("hudSparks", "Amber sparks in the field (share)", 0, 0.15, 0.005),
      abs("hudOffDot", "Unlit LED cells", 0, 0.15, 0.002),
      elem("amberG", "Amber hue (low = red, high = yellow)", "hudAmber", 1, 0.05, 0.7, 0.01),
      abs("tintFieldVar", "Corona green variety (toward white)", 0, 1, 0.01),
      elem("irisAmt", "Iris texture (0 = flat disc)", "irisDetail", 0, 0, 1, 0.01),
      elem("irisFib", "Iris fibres contrast", "irisDetail", 1, 0, 2, 0.01),
      elem("irisLimb", "Iris dark outer ring", "irisDetail", 2, 0, 1, 0.01),
      elem("irisBright", "Iris brightness", "irisDetail", 3, 0.3, 2.5, 0.01),
    ],
  },
  {
    // (the breathing pulse and the speech-driven light: all read every frame)
    title: "Pulse",
    knobs: [
      elem("breathGlow", "Breathing pulse: glow", "breath", 0, 0, 0.5, 0.005),
      elem("breathExp", "Breathing pulse: brightness", "breath", 1, 0, 0.15, 0.001),
      elem("breathHz", "Breathing speed (pulses per second)", "breath", 2, 0.05, 0.8, 0.01),
      elem("voiceGlow", "Glow with her voice", "voiceGlow", 0, 0, 1.5, 0.01),
      elem("fieldWaves", "Waves through the hair / field", "harmSize", 0, 0, 1.2, 0.01),
      elem("ringLight", "Speech rings: brightness", "harmRippleLight", 1, 0, 3, 0.01),
      elem("ringSize", "Speech rings: dot growth", "harmRippleLight", 0, 0, 2, 0.01),
      elem("voiceField", "Field brightness while she talks", "harmVoice", 0, 0, 1.5, 0.01),
    ],
  },
  {
    title: "Light",
    knobs: [
      abs("gain", "Face brightness", 0.5, 4, 0.05),
      abs("gamma", "Face contrast (gamma)", 0.5, 2, 0.01),
      abs("exposure", "Exposure", 0.5, 2.5, 0.01),
      abs("dodge", "Glow (dodge)", 0, 1, 0.01),
      abs("ghost", "Face haze", 0, 0.4, 0.005),
      elem("vignette0", "Vignette", "vignette", 0, 0, 1, 0.01),
    ],
  },
  {
    // (the field toward the card's edges: fewer and dimmer particles over an irregular band)
    title: "Edges",
    knobs: [
      elem("edgeW", "Edge fade: band width", "edgeFade", 0, 0, 0.5, 0.005, "share of the card's short side; 0 = off"),
      elem("edgeD", "Edge fade: density left at the edge", "edgeFade", 1, 0, 1, 0.01),
      elem("edgeB", "Edge fade: brightness left at the edge", "edgeFade", 2, 0, 1, 0.01),
      elem("edgeN", "Edge fade: irregular edge (noise)", "edgeFade", 3, 0, 1.5, 0.01),
      abs("edgeFadeShape", "Edge fade shape: 0 edges, 1 radial", 0, 1, 0.01),
      abs("vignettePost", "Vignette after tone (dims bright dots too)", 0, 1, 0.01),
    ],
  },
  {
    // (the ear and neck fades live on the head, so they turn with her)
    title: "Ears / neck",
    knobs: [
      elem("earIn", "Ear fade: gone inside (ellipse radius)", "earMask", 6, 0, 1.5, 0.01, "0 = ears fully shown"),
      elem("earOut", "Ear fade: kept outside (ellipse radius)", "earMask", 7, 0.1, 2.5, 0.01),
      elem("earRy", "Ear fade: height", "earMask", 4, 0.1, 0.6, 0.01),
      elem("neckY0", "Neck fade: starts below (y)", "neckMask", 0, -0.9, 0, 0.01),
      elem("neckY1", "Neck fade: gone below (y)", "neckMask", 1, -1.2, -0.2, 0.01),
      elem("neckZ0", "Neck fade: starts behind (z)", "neckMask", 2, -0.8, 0, 0.01),
      elem("neckZ1", "Neck fade: gone behind (z)", "neckMask", 3, -1.2, -0.1, 0.01),
    ],
  },
  {
    // (the intro plays once when the card first comes into view; "Replay intro" below plays it again with these)
    title: "Intro",
    knobs: [
      elem("introLen", "Length (s)", "intro", 0, 1, 8, 0.1),
      elem("introRag", "Ragged front", "intro", 1, 0, 1.2, 0.01, "0 = a clean ellipse"),
      elem("introBright", "Bright dots first (s the dim ones lag)", "intro", 2, 0, 1.5, 0.01),
      elem("introFlash", "Flash at the front", "intro", 3, 0, 4, 0.05),
      elem("introBlock", "Front block size (dot pitches)", "introShape", 2, 0.5, 6, 0.1),
      elem("introCorona", "Corona starts at (s)", "introShape", 0, 0, 2.5, 0.05),
      elem("introLag", "Smooth shading lags the dots (s)", "introShape", 1, 0, 1, 0.01),
      elem("introSpark", "Spark between the eyes", "introShape", 3, 0, 3, 0.05),
    ],
  },
  {
    title: "Hair / field",
    knobs: [
      abs("hairDensity", "Hair density", 0, 1, 0.01),
      abs("scatterCount", "Free particles", 0, 8000, 100),
    ],
  },
];
// params whose change rebuilds the particle geometry (engine setLook): applied after the slider settles
const REBUILD = new Set(["gridDiv", "scatterCount", "minPitchDevPx"]);

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fmt = (v: unknown) => (Array.isArray(v) ? v.map((x) => round(x as number)).join(", ") : typeof v === "number" ? String(round(v)) : String(v));
const parse = (s: string): Val | null => {
  const n = s.split(",").map((x) => Number(x.trim()));
  if (!n.length || n.some((x) => !Number.isFinite(x))) return null;
  return n.length > 1 ? n : n[0]!;
};

export default function TunePanel({ engine, base, initial, preset, onHold }: TunePanelProps) {
  // the overrides over the preset, param -> value (what the URL carries)
  const [over, setOver] = useState<Record<string, Val>>(initial);
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("face-tune-open") !== "0"; } catch { return true; }
  });
  const [hold, setHold] = useState(false);
  const [info, setInfo] = useState("");
  const [freeKey, setFreeKey] = useState("");
  const [freeVal, setFreeVal] = useState("");
  const [copied, setCopied] = useState("");
  const look = useMemo(() => ({ ...base, ...over }), [base, over]);
  const sent = useRef<Record<string, Val>>({ ...initial });
  const rebuildTimer = useRef(0);

  // push only what changed since the last push (a rebuild param re-lays the lattice, so it waits for the slider)
  useEffect(() => {
    const now: Record<string, Val> = {};
    const later: Record<string, Val> = {};
    for (const k of new Set([...Object.keys(sent.current), ...Object.keys(over)])) {
      const v = (k in over ? over[k] : base[k]) as Val;
      if (same(v, sent.current[k] ?? base[k])) continue;
      (REBUILD.has(k) ? later : now)[k] = v;
    }
    if (Object.keys(now).length) { engine.setLook(now); Object.assign(sent.current, now); }
    if (Object.keys(later).length) {
      window.clearTimeout(rebuildTimer.current);
      rebuildTimer.current = window.setTimeout(() => { engine.setLook(later); Object.assign(sent.current, later); }, 150);
    }
    const url = new URL(window.location.href);
    for (const k of [...url.searchParams.keys()]) if (k.startsWith("L.")) url.searchParams.delete(k);
    for (const [k, v] of Object.entries(over)) url.searchParams.set(`L.${k}`, Array.isArray(v) ? v.join(",") : String(v));
    window.history.replaceState(null, "", url);
  }, [over, base, engine]);

  useEffect(() => {
    const tick = () => {
      const i = engine.info() as { pitchDev?: number; particles?: Record<string, number> };
      const p = i.particles ?? {};
      setInfo(`grid spacing ${i.pitchDev ?? "?"} device px · face dots ${p.lattice ?? "?"} · field ${p.scatter ?? "?"}`);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [engine]);

  useEffect(() => { onHold(hold); }, [hold, onHold]);
  useEffect(() => {
    try { localStorage.setItem("face-tune-open", open ? "1" : "0"); } catch { /* private mode */ }
  }, [open]);

  const setKnob = (k: Knob, v: number) => {
    const sets = k.set(v, base, look);
    setOver((o) => {
      const n = { ...o };
      for (const [p, x] of Object.entries(sets)) {
        if (same(x, base[p])) delete n[p];
        else n[p] = x;
      }
      return n;
    });
  };
  const resetParam = (p: string) => setOver((o) => { const n = { ...o }; delete n[p]; return n; });
  const copy = async (what: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); } catch { setCopied("copy failed"); }
    window.setTimeout(() => setCopied(""), 1500);
  };
  const keys = useMemo(() => Object.keys(base).filter((k) => typeof base[k] === "number" || Array.isArray(base[k])).sort(), [base]);
  const changed = Object.keys(over).sort();

  // on <body>: the orb card clips and transforms its children; bottom-left, clear of the face card
  return createPortal(
    <div
      className="fixed left-4 bottom-4 z-[80] w-[640px] max-w-[calc(100vw-2rem)] max-h-[82vh] overflow-y-auto rounded-lg border border-white/15 bg-black/85 text-[11px] normal-case tracking-normal text-white/85 shadow-2xl backdrop-blur"
      // the site mono (Proto Mono) draws capitals only: a plain system mono reads better for numbers and names
      style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      // the head follows the pointer anywhere on the page; over the panel it should not count as looking away
      onPointerMove={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left uppercase tracking-wider text-white/70 hover:text-white">
        <span>Face tuning (temporary)</span>
        <span>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          <p className="text-white/50">{info}</p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hold} onChange={(e) => setHold(e.target.checked)} />
            Hold the head still (ignore the mouse)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox" checked={preset === "woman-darkstar"}
              onChange={(e) => {
                // a look is chosen when the engine is made: reload with it (the &L.* values stay in the URL)
                const url = new URL(window.location.href);
                if (e.target.checked) url.searchParams.set("look", "woman-darkstar"); else url.searchParams.delete("look");
                window.location.assign(url);
              }}
            />
            Darkstar look (Top Gun HUD colours)
          </label>
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="min-w-0">
              <legend className="mb-1 uppercase tracking-wider text-white/45">{g.title}</legend>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {g.knobs.map((k) => {
                  const v = k.get(look, base);
                  const dirty = Math.abs(v - k.get(base, base)) > 1e-6;
                  return (
                    <div key={k.id} className="min-w-0">
                      <div className="flex justify-between gap-2">
                        <span className={dirty ? "text-amber-200" : undefined}>{k.label}</span>
                        <span className="flex shrink-0 gap-2">
                          <span className="tabular-nums">{round(v)}</span>
                          {dirty && (
                            <button type="button" title="back to the preset" className="text-white/50 hover:text-white" onClick={() => setKnob(k, k.get(base, base))}>↺</button>
                          )}
                        </span>
                      </div>
                      <input
                        type="range" min={k.min} max={k.max} step={k.step} value={v} aria-label={k.label}
                        onChange={(e) => setKnob(k, Number(e.target.value))} className="w-full accent-amber-300"
                      />
                      {k.hint && <p className="text-[10px] text-white/40">{k.hint}</p>}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <fieldset className="space-y-1">
            <legend className="mb-1 uppercase tracking-wider text-white/45">Any setting</legend>
            <input
              list="face-tune-keys" value={freeKey} placeholder="param name" aria-label="param name"
              onChange={(e) => { setFreeKey(e.target.value); if (e.target.value in look) setFreeVal(fmt(look[e.target.value])); }}
              className="w-full rounded bg-white/10 px-2 py-1"
            />
            <datalist id="face-tune-keys">{keys.map((k) => <option key={k} value={k} />)}</datalist>
            <div className="flex gap-1">
              <input value={freeVal} placeholder="number or a, b, c" aria-label="value" onChange={(e) => setFreeVal(e.target.value)} className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1" />
              <button
                type="button" className="rounded bg-white/15 px-2 hover:bg-white/25"
                onClick={() => {
                  const v = parse(freeVal);
                  if (!(freeKey in base) || v === null) return;
                  setOver((o) => { const n = { ...o }; if (same(v, base[freeKey])) delete n[freeKey]; else n[freeKey] = v; return n; });
                }}
              >Set</button>
            </div>
            {freeKey in base && <p className="text-[10px] text-white/40">preset: {fmt(base[freeKey])}</p>}
          </fieldset>
          {changed.length > 0 && (
            <details className="space-y-1">
              <summary className="cursor-pointer uppercase tracking-wider text-white/45 hover:text-white/70">Changed ({changed.length})</summary>
              {changed.map((p) => (
                <div key={p} className="flex justify-between gap-2">
                  <span className="truncate">{p} = {fmt(over[p])}</span>
                  <button type="button" className="shrink-0 text-white/50 hover:text-white" onClick={() => resetParam(p)}>↺ {fmt(base[p])}</button>
                </div>
              ))}
            </details>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {engine.playIntro && (
              <button type="button" className="rounded bg-amber-300/25 px-2 py-1 hover:bg-amber-300/40" onClick={() => engine.playIntro?.()}>Replay intro</button>
            )}
            <button type="button" className="rounded bg-white/15 px-2 py-1 hover:bg-white/25" onClick={() => setOver({})}>Reset all</button>
            <button type="button" className="rounded bg-white/15 px-2 py-1 hover:bg-white/25" onClick={() => copy("link", window.location.href)}>Copy link</button>
            <button type="button" className="rounded bg-white/15 px-2 py-1 hover:bg-white/25" onClick={() => copy("values", JSON.stringify(over))}>Copy values</button>
            {copied && <span className="self-center text-white/50">{copied === "copy failed" ? copied : `${copied} copied`}</span>}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
