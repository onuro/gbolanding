"use client";

import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownLabels {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

function CornerBrackets({ className = "" }: { className?: string }) {
  return (
    <>
      <span
        className={`absolute bottom-0 left-0 h-2 w-2 border-b border-l border-foreground/30 transition-colors duration-300 group-hover:border-foreground ${className}`}
      />
      <span
        className={`absolute bottom-0 right-0 h-2 w-2 border-b border-r border-foreground/30 transition-colors duration-300 group-hover:border-foreground ${className}`}
      />
      <span
        className={`absolute top-0 right-0 h-2 w-2 border-r border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground ${className}`}
      />
      <span
        className={`absolute top-0 left-0 h-2 w-2 border-l border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground ${className}`}
      />
    </>
  );
}

function CountdownCell({
  label,
  value,
  skeleton = false,
}: {
  label: string;
  value: number;
  skeleton?: boolean;
}) {
  return (
    <div className="countdown-cell group relative flex flex-col items-center border border-border p-3 transition-colors duration-300 hover:border-foreground/20 sm:p-5">
      <span className="text-3xl font-medium tabular-nums tracking-tight text-foreground sm:text-5xl">
        {skeleton ? "--" : String(value).padStart(2, "0")}
      </span>
      <span className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors duration-300 group-hover:text-foreground/70">
        {skeleton ? "···" : label}
      </span>
      <CornerBrackets />
    </div>
  );
}

export default function Countdown({ labels }: { labels: CountdownLabels }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const targetDate = Date.now() + FIFTEEN_DAYS_MS;

    const calculateTimeLeft = () => {
      const difference = targetDate - Date.now();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    const initialTimeout = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 0);

    return () => {
      clearInterval(timer);
      clearTimeout(initialTimeout);
    };
  }, []);

  if (!timeLeft) {
    return (
      <div className="mx-auto grid w-full select-none grid-cols-4 gap-1.5 opacity-50">
        {[...Array(4)].map((_, i) => (
          <CountdownCell key={i} label="" value={0} skeleton />
        ))}
      </div>
    );
  }

  const items = [
    { label: labels.days, value: timeLeft.days },
    { label: labels.hours, value: timeLeft.hours },
    { label: labels.minutes, value: timeLeft.minutes },
    { label: labels.seconds, value: timeLeft.seconds },
  ];

  return (
    <div className="mx-auto grid w-full select-none grid-cols-4 gap-1.5">
      {items.map((item) => (
        <CountdownCell key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}
