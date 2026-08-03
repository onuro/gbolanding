"use client";

import { useEffect, useRef, useState } from "react";
import {
  createStudyOrbGradient,
  type StudyOrbGradientHandle,
} from "./study-orb-gradient-engine";

const CLEAR: Record<"light" | "dark", [number, number, number]> = {
  light: [1, 1, 1],
  dark: [0.043, 0.055, 0.047],
};

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

type StudyOrbGradientProps = {
  className?: string;
};

/**
 * WebGL study orb via createStudyOrbGradient. Theme follows html[data-theme].
 * Ambient glow sits behind the disc and tracks the palette edge colours.
 */
export function StudyOrbGradient({ className }: StudyOrbGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<StudyOrbGradientHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [live, setLive] = useState(false);
  const [blasts, setBlasts] = useState<number[]>([]);
  const lastLevelRef = useRef(0);
  const lastBlastRef = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    setMode(readTheme());

    const observer = new MutationObserver(() => {
      setMode(readTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cancelled = false;
    let handle: StudyOrbGradientHandle | null = null;

    try {
      handle = createStudyOrbGradient(canvas, CLEAR[modeRef.current], {
        onError: (error) => {
          if (!cancelled && import.meta.env.DEV) {
            console.error("[StudyOrbGradient]", error);
          }
        },
        onReady: () => {
          if (!cancelled) setReady(true);
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[StudyOrbGradient]", error);
      }
      return;
    }

    handle.setTheme(modeRef.current);
    handleRef.current = handle;

    let inView = true;
    let documentVisible = !document.hidden;
    const applyPlayingState = () => {
      handle?.setPlaying(!reducedMotion.matches && inView && documentVisible);
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        applyPlayingState();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    const onVisibilityChange = () => {
      documentVisible = !document.hidden;
      applyPlayingState();
    };
    const onMotionPreferenceChange = () => applyPlayingState();
    const onLevel = (event: Event) => {
      const level = (event as CustomEvent<number>).detail ?? 0;
      handleRef.current?.setLevel(level);

      // Speech onset — a jump past the floor, rate-limited so a long sentence
      // sends a few rings, not one per frame.
      const now = performance.now();
      const rising = level - lastLevelRef.current > 0.12;
      lastLevelRef.current = level;
      if (
        rising &&
        level > 0.3 &&
        now - lastBlastRef.current > 450 &&
        !reducedMotion.matches
      ) {
        lastBlastRef.current = now;
        setBlasts((previous) => [...previous.slice(-2), now]);
      }
    };
    const onLive = (event: Event) => {
      const value = (event as CustomEvent<boolean>).detail === true;
      setLive(value);
      handleRef.current?.setActive(value);
    };
    window.addEventListener("orb-level", onLevel);
    window.addEventListener("orb-live", onLive);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    applyPlayingState();

    return () => {
      cancelled = true;
      intersectionObserver.disconnect();
      window.removeEventListener("orb-level", onLevel);
      window.removeEventListener("orb-live", onLive);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionPreferenceChange);
      handle?.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.setTheme(mode);
    handleRef.current?.setClearColor(CLEAR[mode]);
  }, [mode]);

  return (
    <div
      className={`relative isolate aspect-square bg-transparent ${className ?? ""}`}
      data-orb-theme={mode}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-1/2 z-0 size-[115%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${
          ready && live ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="orb-glow-core absolute inset-0" />
        <span className="orb-glow-bloom absolute inset-[-8%]" />
      </div>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
        {blasts.map((id) => (
          <span
            key={id}
            className="orb-blast absolute inset-[15.5%] rounded-full border border-white/50"
            onAnimationEnd={() =>
              setBlasts((previous) => previous.filter((kept) => kept !== id))
            }
          />
        ))}
      </div>

      <div className="relative z-10 size-full">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-shader-variant="study-orb"
          className={`absolute inset-0 block size-full transition-opacity duration-500 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <style>{`
        .orb-blast {
          animation: orb-blast-out 1100ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes orb-blast-out {
          from { transform: scale(1); opacity: 0.5; }
          to { transform: scale(1.75); opacity: 0; }
        }

        .orb-glow-core {
          border-radius: 9999px;
          background:
            radial-gradient(circle at 50% 48%,
              rgb(110 240 185 / 55%) 0%,
              rgb(25 160 110 / 32%) 26%,
              rgb(14 90 120 / 22%) 46%,
              transparent 70%);
          filter: blur(22px);
        }

        .orb-glow-bloom {
          border-radius: 9999px;
          background:
            radial-gradient(circle at 40% 36%,
              rgb(200 255 230 / 28%) 0%,
              transparent 44%),
            radial-gradient(circle at 64% 60%,
              rgb(50 150 190 / 26%) 0%,
              transparent 48%);
          filter: blur(34px);
        }

        [data-orb-theme="light"] .orb-glow-core {
          background:
            radial-gradient(circle at 50% 48%,
              rgb(16 185 129 / 36%) 0%,
              rgb(13 148 136 / 18%) 32%,
              rgb(14 116 144 / 12%) 50%,
              transparent 72%);
        }

        [data-orb-theme="light"] .orb-glow-bloom {
          background:
            radial-gradient(circle at 42% 38%,
              rgb(167 243 208 / 36%) 0%,
              transparent 44%),
            radial-gradient(circle at 62% 58%,
              rgb(125 211 252 / 22%) 0%,
              transparent 48%);
        }

      `}</style>
    </div>
  );
}
