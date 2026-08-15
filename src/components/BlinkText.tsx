"use client";

import { animate, createScope } from "animejs";
import { splitText } from "animejs/text";
import { useEffect, useRef } from "react";

export interface BlinkTimingConfig {
  /** Seconds each part takes to fade up from nothing. */
  fadeTime?: number;
  randomHoldMin?: number;
  randomHoldMax?: number;
  blinkTimeMin?: number;
  blinkTimeMax?: number;
}

interface BlinkTextProps {
  text: string;
  mode?: "words" | "chars";
  /** Seconds between each part starting. Tightened to honour `maxDuration`. */
  staggerDelay?: number;
  /** Seconds before the first part starts. */
  delay?: number;
  /** Seconds by which the slowest part must have settled. */
  maxDuration?: number;
  timingConfig?: BlinkTimingConfig;
  className?: string;
  /**
   * Keep the line painted from first HTML. LCP cannot fire on opacity:0, so
   * the hero title uses this and only flickers after it is already readable.
   */
  priority?: boolean;
}

/**
 * Reveals a line word by word, each one flickering as it lands.
 *
 * The text is rendered server-side. Below-the-fold lines stay hidden until
 * hydrate (`html.js [data-blink=idle]`); the hero passes `priority` so LCP
 * can paint immediately. Pair with `client:visible` below the fold and
 * `client:idle` on the hero.
 */
export default function BlinkText({
  text,
  mode = "words",
  staggerDelay = 0.1,
  delay = 0,
  maxDuration = 3,
  timingConfig,
  className,
  priority = false,
}: BlinkTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // A flicker is precisely what this preference asks us not to do.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      container.dataset.blink = "done";
      return;
    }

    const {
      fadeTime = 0.21,
      randomHoldMin = 0,
      randomHoldMax = 0.3,
      blinkTimeMin = 0.13,
      blinkTimeMax = 0.51,
    } = timingConfig ?? {};

    // Worst case for a single part, since hold and blink are randomised.
    const slowestPart = fadeTime + randomHoldMax + blinkTimeMax;

    scopeRef.current = createScope({ root: containerRef }).add(() => {
      const split = splitText(container, { [mode]: true });
      const parts = mode === "chars" ? split.chars : split.words;

      // Priority lines are already the LCP element — do not blank them.
      // Other lines hide first so they never flash complete for a frame.
      if (!priority) {
        parts.forEach((part) => {
          part.style.opacity = "0";
        });
      }
      container.dataset.blink = "done";

      // Long headings would otherwise run past the budget on stagger alone, so
      // the gap closes up to fit rather than the line taking however long.
      const budget = Math.max(0, maxDuration - delay - slowestPart);
      const stagger =
        parts.length > 1
          ? Math.min(staggerDelay, budget / (parts.length - 1))
          : 0;

      parts.forEach((part, index) => {
        const hold =
          randomHoldMin + Math.random() * (randomHoldMax - randomHoldMin);
        const blink =
          blinkTimeMin + Math.random() * (blinkTimeMax - blinkTimeMin);
        const segment = (blink * 1000) / 4;

        animate(part, {
          opacity: [
            { to: 1, duration: fadeTime * 1000 },
            { to: 0.5, duration: hold * 1000 },
            { to: 0.2, duration: segment },
            { to: 1, duration: segment },
            { to: 0.2, duration: segment },
            { to: 1, duration: segment },
          ],
          delay: delay * 1000 + index * stagger * 1000,
          ease: "inQuad",
        });
      });
    });

    return () => {
      scopeRef.current?.revert();
    };
  }, [text, mode, staggerDelay, delay, maxDuration, timingConfig, priority]);

  return (
    <span
      ref={containerRef}
      className={className}
      data-blink={priority ? "done" : "idle"}
    >
      {text}
    </span>
  );
}
