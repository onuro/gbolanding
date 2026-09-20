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
  /** Pin the shader to one poster. The hero well is always dark. */
  theme?: "light" | "dark";
};

/**
 * WebGL study orb via createStudyOrbGradient. Theme follows html[data-theme]
 * unless `theme` pins it.
 */
export function StudyOrbGradient({ className, theme }: StudyOrbGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<StudyOrbGradientHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">(theme ?? "dark");
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (theme) {
      setMode(theme);
      return;
    }

    setMode(readTheme());

    const observer = new MutationObserver(() => {
      setMode(readTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // ?kill=orb — see CrashProbe. The WebGL surface, its two mipmapped posters
    // and the three.js runtime are the largest single thing this page holds.
    if (document.documentElement.dataset.kill?.split(",").includes("orb")) {
      return;
    }

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
    };
    const onLive = (event: Event) => {
      handleRef.current?.setActive(
        (event as CustomEvent<boolean>).detail === true,
      );
    };
    window.addEventListener("orb-level", onLevel);
    window.addEventListener("orb-live", onLive);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionPreferenceChange);
    applyPlayingState();

    // Dev-only scripted speech for tuning the talking motion. The condition is
    // folded away in a production build, taking the module with it.
    let mimic: typeof import("./mimic-talking") | null = null;
    if (import.meta.env.DEV && !reducedMotion.matches) {
      void import("./mimic-talking").then((module) => {
        if (cancelled) return;
        mimic = module;
        module.startMimicTalking();
      });
    }

    return () => {
      cancelled = true;
      mimic?.stopMimicTalking();
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
      <div className="relative z-10 size-full">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-shader-variant="study-orb"
          className={`absolute inset-0 block size-full transition-opacity duration-500 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* 2.6 in the shader → disc diameter is 1/1.3 of the quad. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-[calc(100%/1.3)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/44"
        />
      </div>
    </div>
  );
}
