"use client";

import { Room, RoomEvent, Track } from "livekit-client";
import { Play, Square } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Logomark } from "@/components/logo";
import { denoise, MIC_CONSTRAINTS } from "./denoise";
import { connectOrbLevel } from "./orb-level";

// Astro inlines PUBLIC_* at build time; when it is missing, a production build
// must not fall back to a localhost the visitor's browser cannot reach.
const GBO_API =
  import.meta.env.PUBLIC_GBO_API ??
  (import.meta.env.DEV
    ? "http://localhost:3010"
    : "https://kollektor.gbovision.com");

type Labels = {
  idle: string;
  connecting: string;
  live: string;
  error: string;
  micDenied: string;
  micMissing: string;
  micError: string;
  soundBlocked: string;
};

/**
 * The three getUserMedia failures worth telling apart — each has a different
 * fix, and "microphone unavailable" tells a visitor which of them to try.
 * NotReadableError is the Windows one: another app holds the device.
 */
function micLabel(cause: unknown, labels: Labels) {
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return labels.micDenied;
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return labels.micMissing;
  return labels.micError;
}

// ponytail: only the utterance being spoken right now — a hero caption, not a
// chat log. Keep a transcript array here if the call ever needs history.
type Caption = { id: string; text: string };

/**
 * Mints a LiveKit token on click (it lives 2 minutes), joins the room, and
 * feeds the agent's audio into the orb's rim wave.
 */
export function VoiceButton({
  labels,
  lang,
}: {
  labels: Labels;
  lang: "tr" | "en";
}) {
  const roomRef = useRef<Room | null>(null);
  const stopLevelRef = useRef<(() => void) | null>(null);
  const stopMicRef = useRef<(() => void) | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const [error, setError] = useState<string | null>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [caption, setCaption] = useState<Caption | null>(null);
  const captionSegment = useRef<{ id: string; startedAt: number } | null>(null);

  useEffect(
    () => () => {
      stopLevelRef.current?.();
      stopMicRef.current?.();
      roomRef.current?.disconnect();
      window.dispatchEvent(new CustomEvent("orb-live", { detail: false }));
    },
    [],
  );

  async function start() {
    setState("connecting");
    setError(null);

    // Ask for the mic first, while the click still counts as user activation.
    // Requesting it after the token fetch and room.connect (as we used to) puts
    // the prompt outside that window, and Windows Chrome auto-dismisses it —
    // every retry then lands on the same silent block with no prompt shown.
    // A refusal is not fatal: the visitor can still listen to the agent.
    let mic: MediaStreamTrack | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: MIC_CONSTRAINTS,
      });
      mic = stream.getAudioTracks()[0] ?? null;
    } catch (cause) {
      setError(micLabel(cause, labels));
    }

    // RNNoise on top of the browser filters. It loads a worklet and ~150 kB of
    // wasm, so a failure here must not end the call — publish the raw mic.
    if (mic) {
      const raw = mic;
      stopMicRef.current = () => raw.stop();
      try {
        const filter = await denoise(raw);
        mic = filter.track;
        stopMicRef.current = filter.stop;
      } catch (cause) {
        console.warn("rnnoise unavailable, using the raw microphone", cause);
      }
    }

    let token: string;
    let url: string;
    try {
      // The agent picks its instructions, greeting, STT hints and TTS voice
      // from this, so a visitor on /en/* is not answered in Turkish.
      const res = await fetch(`${GBO_API}/gbo/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? labels.error);
      }
      ({ token, url } = await res.json());
    } catch (cause) {
      releaseMic();
      setError(cause instanceof Error ? cause.message : labels.error);
      setState("idle");
      return;
    }

    const room = new Room();
    roomRef.current = room;
    setCaption(null);

    // Agent + user speech arrive as text streams, one per utterance, growing
    // chunk by chunk while the turn is still being spoken.
    // The agent sends one stream per reply and appends to it. Speech recognition
    // works the other way: every revision of what you just said arrives as a
    // *fresh* stream carrying the whole sentence again, several times a second.
    // Keying on the stream id therefore reads each revision as a new utterance.
    // The segment id is the one that holds still for the length of an utterance,
    // whoever is speaking.
    room.registerTextStreamHandler("lk.transcription", async (reader) => {
      const id = reader.info.attributes?.["lk.segment_id"] ?? reader.info.id;
      const startedAt = reader.info.timestamp;
      let text = "";
      for await (const chunk of reader) {
        text += chunk;
        // On a barge-in both sides stream at once; without this the caption
        // would flip between the two utterances on every chunk.
        const showing = captionSegment.current;
        if (showing && showing.id !== id && showing.startedAt > startedAt) {
          continue;
        }
        captionSegment.current = { id, startedAt };
        setCaption({ id, text });
      }
    });

    // Agent audio never plays itself — attach each subscribed track to the DOM,
    // and drive the orb wave from the same track.
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== "audio") return;
      document.body.appendChild(track.attach());
      if (track.mediaStreamTrack) meter(track.mediaStreamTrack);
    });
    // The agent's track arrives seconds after the click, so its play() lands
    // outside the gesture window. Without mic permission Chrome has no autoplay
    // exemption to fall back on and the call goes silent — offer a fresh click.
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      setSoundBlocked(!room.canPlaybackAudio);
    });
    room.on(RoomEvent.Disconnected, () => {
      stopLevelRef.current?.();
      stopLevelRef.current = null;
      releaseMic();
      tracksRef.current = [];
      window.dispatchEvent(new CustomEvent("orb-level", { detail: 0 }));
      window.dispatchEvent(new CustomEvent("orb-live", { detail: false }));
      roomRef.current = null;
      captionSegment.current = null;
      setCaption(null);
      setSoundBlocked(false);
      setState("idle");
    });

    try {
      await room.connect(url, token);
      // Both need the user gesture we are still inside of.
      await room.startAudio();
      window.dispatchEvent(new CustomEvent("orb-live", { detail: true }));
      setState("live");
    } catch (cause) {
      releaseMic();
      room.disconnect();
      setError(cause instanceof Error ? cause.message : labels.error);
      setState("idle");
      return;
    }

    if (!mic) return;
    try {
      await room.localParticipant.publishTrack(mic, {
        source: Track.Source.Microphone,
      });
      // Metering the mic too, so the orb answers your voice as well as the agent's.
      meter(mic);
    } catch {
      releaseMic();
      setError(labels.micError);
    }
  }

  // The raw mic lives in our own AudioContext, so LiveKit cannot free it.
  function releaseMic() {
    stopMicRef.current?.();
    stopMicRef.current = null;
  }

  // Tracks trickle in (agent audio, then mic), so rebuild the meter each time.
  function meter(track: MediaStreamTrack) {
    tracksRef.current = [...tracksRef.current, track];
    stopLevelRef.current?.();
    stopLevelRef.current = connectOrbLevel(...tracksRef.current);
  }

  const label =
    state === "live"
      ? labels.live
      : state === "connecting"
        ? labels.connecting
        : labels.idle;

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        {/* Takes the play button's place in the hollow once the agent is up. */}
        <Logomark
          aria-hidden="true"
          focusable="false"
          className={`absolute w-20 text-foreground transition-opacity duration-500 sm:w-24 ${
            state === "live" ? "opacity-100" : "opacity-0"
          }`}
        />
        <button
          type="button"
          onClick={start}
          disabled={state !== "idle"}
          aria-hidden={state !== "idle"}
          className={`flex size-14 items-center justify-center rounded-full bg-foreground text-background outline-none transition duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            state === "idle"
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none scale-90 opacity-0"
          }`}
          aria-label={label}
        >
          <Play
            aria-hidden="true"
            className="size-5 translate-x-0.5 fill-current"
          />
        </button>
      </div>

      <HollowLabel text={label} hidden={state === "live"} />

      {caption && <CircularCaption id={caption.id} text={caption.text} />}

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-3 px-6">
        {soundBlocked && (
          <button
            type="button"
            onClick={() => void roomRef.current?.startAudio()}
            className="pointer-events-auto rounded-full border border-attention-line bg-attention-soft px-3 py-1 text-xs text-attention outline-none transition hover:bg-attention-soft/60 focus-visible:ring-2 focus-visible:ring-attention"
          >
            {labels.soundBlocked}
          </button>
        )}
        {state === "live" ? (
          <div className="pointer-events-auto flex items-center gap-2">
            <span className="text-xs text-foreground/70">{labels.live}</span>
            <button
              type="button"
              onClick={() => roomRef.current?.disconnect()}
              aria-label={labels.live}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Square aria-hidden="true" className="size-3 fill-current" />
            </button>
          </div>
        ) : (
          // Below sm the hollow is too small to carry the label legibly.
          <p className="text-center text-sm font-medium text-foreground/80 sm:hidden">
            {label}
          </p>
        )}
        {error && (
          <p role="alert" className="max-w-xs text-center text-xs text-red-400">
            {error}
          </p>
        )}
      </div>

      <style>{`
        .orb-badge {
          transform-box: view-box;
          transform-origin: 50% 50%;
          animation: orb-badge-spin 36s linear infinite;
        }

        @keyframes orb-badge-spin {
          to { transform: rotate(360deg); }
        }

        /* The ring turns to keep the line centred on the bottom of the orb, so
           a word arriving carries the whole caption round with it. */
        .orb-caption-ring {
          transform-box: view-box;
          transform-origin: 50% 50%;
          transition: transform 520ms cubic-bezier(0.22, 0.61, 0.36, 1);
          will-change: transform;
        }

        .orb-caption-word-out {
          animation: orb-word-out ${CAPTION_FADE}ms ease-in forwards;
        }

        @keyframes orb-word-out {
          from { opacity: 1; fill-opacity: 1; }
          to { opacity: 0; fill-opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-badge {
            animation: none;
          }

          .orb-caption-ring {
            transition: none;
          }

          .orb-caption-word-out {
            animation: none;
            opacity: 0;
            fill-opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

/** Full circle around (500, 500) from 12 o'clock. Sweep 1 runs it clockwise. */
function ring(r: number, sweep: 0 | 1) {
  const top = 500 - r;
  const bottom = 500 + r;
  return `M 500 ${top} A ${r} ${r} 0 0 ${sweep} 500 ${bottom} A ${r} ${r} 0 0 ${sweep} 500 ${top}`;
}

// The shader hollow is 0.46 of the disc, so ~159 in this space. Clockwise from
// 12 o'clock, with the glyphs sitting outside the baseline, puts the ring just
// inside that hole and reads the right way up across the top.
const BADGE_R = 126;
const BADGE_CIRC = 2 * Math.PI * BADGE_R;
// Two half circles rather than one arc back to its own start: with coincident
// endpoints the centre is ambiguous and the flags can resolve it a diameter
// away from where it belongs.
const BADGE_PATH = ring(BADGE_R, 1);
// Letter spacing also lands after the last glyph, and anything past the end of
// the path is dropped, so the line aims a shade under the circumference.
const BADGE_FILL = 0.985;
const BADGE_SIZE = 23;
const BADGE_TRACK = 3.2;

/**
 * The call to action, set as a rotating ring inside the orb's hollow.
 *
 * The label repeats as many times as the ring will take, then the size and the
 * tracking are nudged so the repeats close the circle exactly — otherwise a
 * longer translation either overflows the path or leaves a bald patch.
 */
function HollowLabel({ text, hidden }: { text: string; hidden: boolean }) {
  const rulerRef = useRef<SVGTextElement>(null);
  const unit = `${text} · `;
  const [fit, setFit] = useState({
    text: "",
    repeats: 2,
    size: BADGE_SIZE,
    track: BADGE_TRACK,
  });

  useLayoutEffect(() => {
    const width = rulerRef.current?.getComputedTextLength() ?? 0;
    if (!width) return;

    const room = BADGE_CIRC * BADGE_FILL;
    const repeats = Math.min(4, Math.max(1, Math.round(room / width)));
    const size = Math.min(1, room / (repeats * width));
    const slack = room - repeats * width * size;
    setFit({
      text,
      repeats,
      size: BADGE_SIZE * size,
      track: BADGE_TRACK * size + slack / (repeats * unit.length),
    });
  }, [text, unit.length]);

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 hidden items-center justify-center transition-opacity duration-500 sm:flex ${
        hidden ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="relative aspect-square w-[min(100%,min(101cqmin,46rem))]">
        <svg
          viewBox="0 0 1000 1000"
          className="absolute inset-0 size-full font-mono uppercase text-foreground/70"
        >
          <defs>
            <path id="orb-badge-path" d={BADGE_PATH} fill="none" />
          </defs>
          <text
            ref={rulerRef}
            x="0"
            y="-1000"
            visibility="hidden"
            fontSize={BADGE_SIZE}
            letterSpacing={BADGE_TRACK}
          >
            {unit}
          </text>
          {fit.text === text && (
            <g className="orb-badge">
              <text
                className="fill-current"
                fontSize={fit.size}
                letterSpacing={fit.track}
              >
                <textPath href="#orb-badge-path" startOffset="0">
                  {unit.repeat(fit.repeats)}
                </textPath>
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// Same 1000² space as the orb canvas: the disc edge is at 345 and the first HUD
// ring at ~503, so the line rides the empty band between them and hugs the orb.
const CAPTION_C = 500;
const CAPTION_R = 420;
// Counter-clockwise from 12 o'clock, so a line laid from the start of the path
// and turned half a circle reads left to right along the bottom of the orb.
const CAPTION_PATH = ring(CAPTION_R, 0);
const CAPTION_CIRC = 2 * Math.PI * CAPTION_R;
// A line may run the whole ring, less a gap at 12 o'clock so the head and the
// tail never meet and read as one word.
const CAPTION_ARC = CAPTION_CIRC * 0.92;
const CAPTION_SIZE = 30;
// How long a word that has run off the head lingers while it fades out.
const CAPTION_FADE = 420;

/**
 * Live transcript bent around the orb.
 *
 * The line is laid out from the top of the ring and rotated so that its *end*
 * sits at the bottom of the orb: whatever was said last is always upright and
 * dead centre, and each new word turns the ring clockwise, carrying the older
 * words up the left side. Once a turn fills the ring they fade off the head.
 */
function CircularCaption({ id, text }: Caption) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const pathId = `orb-cap-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const rulerRef = useRef<SVGTextElement>(null);
  const [ring, setRing] = useState({
    turn: id,
    drop: 0,
    retired: 0,
    spin: -180,
    snap: false,
  });
  // A turn starts from the top again; reading that off the state rather than
  // resetting it in an effect keeps the first chunk from rendering trimmed.
  const carried =
    ring.turn === id
      ? ring
      : { turn: id, drop: 0, retired: 0, spin: -180, snap: false };
  // Speech recognition rewrites an utterance as it goes, so it can get shorter
  // as well as longer. Both pointers have to stay inside the line.
  const last = Math.max(0, words.length - 1);
  const active = {
    ...carried,
    drop: Math.min(carried.drop, last),
    retired: Math.min(carried.retired, last),
  };
  const line = words.join(" ");

  // Measured off a straight copy of the line: the advance is the same as on the
  // path, and a plain text element reports substring widths reliably.
  useLayoutEffect(() => {
    const ruler = rulerRef.current;
    if (!ruler) return;

    const starts = [0];
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === " ") starts.push(i + 1);
    }

    let drop = active.drop;
    let shown: number;
    try {
      while (
        drop < starts.length - 1 &&
        ruler.getSubStringLength(starts[drop], line.length - starts[drop]) >
          CAPTION_ARC
      ) {
        drop += 1;
      }
      const from = starts[Math.min(active.retired, starts.length - 1)];
      shown = ruler.getSubStringLength(from, line.length - from);
    } catch {
      return;
    }

    // Put the end of the line at 6 o'clock. Growing the line therefore winds
    // the ring clockwise and the newest words stay upright at the bottom.
    const spin = (shown / CAPTION_CIRC) * 360 - 180;
    if (drop !== active.drop || Math.abs(spin - active.spin) > 0.01) {
      // Only retiring the head shortens the line, and that must not animate:
      // the words still on screen have to hold their place while it unmounts.
      setRing({
        turn: id,
        drop,
        retired: active.retired,
        spin,
        snap: spin < active.spin,
      });
    }
  }, [id, line, active.drop, active.retired, active.spin]);

  // Unmount the head only once it has finished fading.
  useEffect(() => {
    if (active.retired >= active.drop) return;
    const timer = window.setTimeout(() => {
      setRing((prev) =>
        prev.turn === id ? { ...prev, retired: prev.drop } : prev,
      );
    }, CAPTION_FADE);
    return () => window.clearTimeout(timer);
  }, [id, active.drop, active.retired]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <span className="sr-only" aria-live="polite">
        {text}
      </span>
      <div className="relative aspect-square w-[min(100%,min(101cqmin,46rem))]">
        <svg
          viewBox="0 0 1000 1000"
          aria-hidden="true"
          className="absolute inset-0 size-full text-foreground"
        >
          <defs>
            <path id={pathId} d={CAPTION_PATH} fill="none" />
          </defs>
          <text
            ref={rulerRef}
            x="0"
            y="-1000"
            visibility="hidden"
            fontSize={CAPTION_SIZE}
            letterSpacing="0.6"
          >
            {line}
          </text>
          {/* Remounted per turn, so a new speaker starts in place instead of
              winding round from wherever the last line ended. */}
          <g
            key={id}
            className="orb-caption-ring"
            style={{
              transform: `rotate(${active.spin}deg)`,
              transition: active.snap ? "none" : undefined,
            }}
          >
            <text
              className="fill-current"
              fontSize={CAPTION_SIZE}
              letterSpacing="0.6"
            >
              <textPath href={`#${pathId}`} startOffset="0" textAnchor="start">
                {words.slice(active.retired).map((word, i) => {
                  const index = i + active.retired;
                  return (
                    <tspan
                      key={`${id}-${index}`}
                      className={
                        index < active.drop ? "orb-caption-word-out" : undefined
                      }
                    >
                      {i === 0 ? word : ` ${word}`}
                    </tspan>
                  );
                })}
              </textPath>
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
