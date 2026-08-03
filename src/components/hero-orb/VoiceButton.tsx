"use client";

import { Room, RoomEvent } from "livekit-client";
import { Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
};

// ponytail: only the utterance being spoken right now — a hero caption, not a
// chat log. Keep a transcript array here if the call ever needs history.
type Caption = { id: string; text: string };

/**
 * Mints a LiveKit token on click (it lives 2 minutes), joins the room, and
 * feeds the agent's audio into the orb's rim wave.
 */
export function VoiceButton({ labels }: { labels: Labels }) {
  const roomRef = useRef<Room | null>(null);
  const stopLevelRef = useRef<(() => void) | null>(null);
  const tracksRef = useRef<MediaStreamTrack[]>([]);
  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  // Long lines: keep the tail in view, the way live captions read.
  useEffect(() => {
    const box = captionRef.current;
    if (box) box.scrollLeft = box.scrollWidth;
  }, [caption?.text]);

  useEffect(
    () => () => {
      stopLevelRef.current?.();
      roomRef.current?.disconnect();
      window.dispatchEvent(new CustomEvent("orb-live", { detail: false }));
    },
    [],
  );

  async function start() {
    setState("connecting");
    setError(null);

    let token: string;
    let url: string;
    try {
      const res = await fetch(`${GBO_API}/gbo/session`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? labels.error);
      }
      ({ token, url } = await res.json());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : labels.error);
      setState("idle");
      return;
    }

    const room = new Room();
    roomRef.current = room;
    setCaption(null);

    // Agent + user speech arrive as text streams, one per utterance, growing
    // chunk by chunk while the turn is still being spoken.
    room.registerTextStreamHandler("lk.transcription", async (reader) => {
      const id = reader.info.id;
      let text = "";
      for await (const chunk of reader) {
        text += chunk;
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
    room.on(RoomEvent.Disconnected, () => {
      stopLevelRef.current?.();
      stopLevelRef.current = null;
      tracksRef.current = [];
      window.dispatchEvent(new CustomEvent("orb-level", { detail: 0 }));
      window.dispatchEvent(new CustomEvent("orb-live", { detail: false }));
      roomRef.current = null;
      setCaption(null);
      setState("idle");
    });

    try {
      await room.connect(url, token);
      // Both need the user gesture we are still inside of.
      await room.startAudio();
      // Metering the mic too, so the orb answers your voice as well as the agent's.
      const microphone = await room.localParticipant.setMicrophoneEnabled(true);
      if (microphone?.track?.mediaStreamTrack) {
        meter(microphone.track.mediaStreamTrack);
      }
      window.dispatchEvent(new CustomEvent("orb-live", { detail: true }));
      setState("live");
    } catch (cause) {
      room.disconnect();
      setError(cause instanceof Error ? cause.message : labels.error);
      setState("idle");
    }
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
        <button
          type="button"
          onClick={start}
          disabled={state !== "idle"}
          aria-hidden={state !== "idle"}
          className={`flex size-14 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg shadow-black/30 outline-none transition duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex flex-col items-center gap-3 px-6">
        {caption && (
          <div
            ref={captionRef}
            key={caption.id}
            aria-live="polite"
            className="orb-caption w-full max-w-sm overflow-hidden"
          >
            <p className="whitespace-nowrap text-center text-sm text-foreground">
              {caption.text}
            </p>
          </div>
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
          <p className="text-center text-sm font-medium text-foreground/80">
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
        /* Keyed on the utterance id, so it plays once per turn, not per chunk. */
        .orb-caption { animation: orb-caption-in 220ms ease-out both; }

        @keyframes orb-caption-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orb-caption { animation: none; }
        }
      `}</style>
    </>
  );
}
