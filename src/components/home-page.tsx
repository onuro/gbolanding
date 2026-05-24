import React from "react";
import { ArrowRight, Bot, Building2, Layers } from "lucide-react";

import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/types";
import { LogoShape, Logotype } from "@/components/logo";
import Countdown from "@/components/countdown";
import LanguageSwitcher from "@/components/language-switcher";
import SignupForm from "@/components/signup-form";

const RUNG_COUNT = 10;

const featureIcons = [Bot, Building2, Layers] as const;

const Ladder = ({ side }: { side: "left" | "right" }) => (
  <div className="flex h-full w-full flex-col">
    {Array.from({ length: RUNG_COUNT }).map((_, i) => (
      <div
        key={i}
        className={`relative w-full flex-1 ${side === "left" ? "border-r" : "border-l"} ${i !== RUNG_COUNT - 1 ? "border-b-2" : ""}`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(315deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
          backgroundSize: "7px 7px",
          color: "oklch(from var(--foreground) l c h / 0.06)",
        }}
      />
    ))}
  </div>
);

function CornerBrackets({ size = "sm" }: { size?: "sm" | "md" }) {
  const s = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <>
      <span className={`absolute bottom-0 right-0 ${s} border-b border-r border-foreground/30 transition-colors duration-300 group-hover:border-foreground`} />
      <span className={`absolute bottom-0 left-0 ${s} border-b border-l border-foreground/30 transition-colors duration-300 group-hover:border-foreground`} />
      <span className={`absolute top-0 right-0 ${s} border-r border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground`} />
      <span className={`absolute top-0 left-0 ${s} border-l border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground`} />
    </>
  );
}

interface HomePageProps {
  locale: Locale;
  messages: Messages;
}

export default function HomePage({ locale, messages }: HomePageProps) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* Nav */}
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col border-x">
        <header className="relative flex h-(--nav-height) items-center justify-between px-6">
          <div className="group flex cursor-pointer select-none items-center gap-2.5">
            <LogoShape
              glow={false}
              className="h-8 w-6 text-foreground transition-transform duration-500 group-hover:scale-105"
            />
            <Logotype
              glow={false}
              className="h-5 w-fit text-foreground transition-opacity duration-300 group-hover:opacity-80"
            />
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <div className="group relative w-fit">
              <a
                href="#waitlist"
                className="relative flex h-8 cursor-pointer items-center gap-1.5 overflow-hidden border border-dashed border-border bg-card px-4 text-xs font-medium text-foreground/80 transition-colors duration-300 hover:bg-muted hover:text-foreground"
              >
                {messages.nav.joinWaitlist}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <CornerBrackets />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 z-10 size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border border-border bg-background" />
          <div className="absolute bottom-0 right-0 z-10 size-2.5 translate-x-1/2 translate-y-1/2 rounded-full border border-border bg-background" />
          <div className="absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b" />
        </header>
      </div>

      {/* Main */}
      <div className="flex w-full flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,80rem)_minmax(0,1fr)]">
        <aside className="pointer-events-none hidden pr-[20%] xl:flex">
          <Ladder side="left" />
        </aside>

        <main className="relative z-10 mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col border-x">
          <div className="hero-bg relative isolate flex flex-1 flex-col items-center justify-center gap-12 overflow-hidden px-6 py-16 text-center sm:gap-14 sm:py-20">
            {/* Brand mark */}
            <div className="animate-fade-in flex select-none flex-col items-center">
              <LogoShape glow={false} className="h-28 w-20 text-brand" />
            </div>

            {/* Titles */}
            <div className="animate-fade-in flex flex-col items-center gap-5">
              <a
                href="#waitlist"
                className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden border border-border bg-card px-3 py-1 font-mono text-[10px] font-light uppercase tracking-widest text-muted-foreground transition-all duration-300 hover:text-foreground"
              >
                <span className="relative flex h-1.5 w-1.5 animate-[rotate-sequence_2s_linear_infinite]">
                  <span className="absolute inline-flex h-full w-full animate-[ping-sequence_2s_linear_infinite] bg-brand opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 bg-brand" />
                </span>
                {messages.hero.badge}
                <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>

              <h1 className="text-balance text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl">
                {messages.hero.titleLineOne}
                <br />
                {messages.hero.titleLineTwo}
              </h1>

              <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {messages.hero.description}
              </p>
            </div>

            {/* Countdown */}
            <div className="w-full max-w-lg">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {messages.countdown.heading}
              </p>
              <Countdown
                labels={{
                  days: messages.countdown.days,
                  hours: messages.countdown.hours,
                  minutes: messages.countdown.minutes,
                  seconds: messages.countdown.seconds,
                }}
              />
            </div>

            {/* Signup */}
            <div id="waitlist" className="w-full max-w-lg scroll-mt-24">
              <SignupForm
                copy={{
                  placeholder: messages.signup.placeholder,
                  notify: messages.signup.notify,
                  sending: messages.signup.sending,
                  successTitle: messages.signup.successTitle,
                  successBody: messages.signup.successBody,
                  requiredError: messages.signup.errors.required,
                  invalidError: messages.signup.errors.invalid,
                }}
              />
            </div>
          </div>

          {/* Feature grid */}
          <section className="border-t border-border px-6 py-10">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-1.5 text-left md:grid-cols-3">
              {messages.features.map(({ label, title, body }, index) => {
                const Icon = featureIcons[index] ?? Layers;

                return (
                  <div
                    key={title}
                    className="glass-panel group relative flex flex-col border border-border p-6 transition-colors duration-300 hover:border-foreground/20"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center border border-border bg-muted text-foreground transition-colors duration-300 group-hover:text-brand">
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {label}
                      </span>
                    </div>

                    <div className="mb-4 border-t border-dashed border-border/40" />

                    <h3 className="mb-2 text-xl font-medium text-foreground">
                      {title}
                    </h3>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {body}
                    </p>

                    <CornerBrackets size="md" />
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="pointer-events-none hidden pl-[20%] xl:flex">
          <Ladder side="right" />
        </aside>
      </div>

      {/* Footer */}
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col border-x">
        <footer className="relative h-(--footer-height) px-6">
          <div className="flex h-full items-center">
            <span className="font-mono text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} GBO Vision - {messages.footer.rightsReserved}
            </span>
          </div>

          <div className="absolute top-0 left-0 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
          <div className="absolute top-0 right-0 z-10 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
          <div className="absolute top-0 left-1/2 w-screen -translate-x-1/2 border-t" />
        </footer>
      </div>
    </div>
  );
}
