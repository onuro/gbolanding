"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";

interface SignupCopy {
  placeholder: string;
  notify: string;
  sending: string;
  successTitle: string;
  successBody: string;
  requiredError: string;
  invalidError: string;
}

function CornerBrackets() {
  return (
    <>
      <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
      <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
      <span className="absolute top-0 right-0 h-2 w-2 border-r border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
      <span className="absolute top-0 left-0 h-2 w-2 border-l border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
    </>
  );
}

export default function SignupForm({ copy }: { copy: SignupCopy }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gbo_signed_up") === "true") {
      const timeout = setTimeout(() => {
        setIsSubmitted(true);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, []);

  const validateEmail = (val: string) => {
    if (!val) {
      return copy.requiredError;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) {
      return copy.invalidError;
    }
    return "";
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (error) {
      setError(validateEmail(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valError = validateEmail(email);
    if (valError) {
      setError(valError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
    localStorage.setItem("gbo_signed_up", "true");

    triggerConfetti();
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#05dd87", "#ffffff", "#a1a1a1"],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#05dd87", "#ffffff", "#a1a1a1"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  if (isSubmitted) {
    return (
      <div className="glass-panel group relative mx-auto flex w-full flex-col items-center border border-border p-6 text-center">
        <div className="mb-4 flex h-11 w-11 items-center justify-center border border-brand/30 bg-brand/10 text-brand">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-foreground">
          {copy.successTitle}
        </h3>
        <p className="text-sm text-muted-foreground">
          {copy.successBody}
        </p>
        <CornerBrackets />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <form onSubmit={handleSubmit} className="group relative">
        <div className="glass-panel relative flex items-center border border-border">
          <Mail className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-foreground" />

          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            disabled={isSubmitting}
            placeholder={copy.placeholder}
            className={`w-full bg-transparent py-3.5 pl-11 pr-32 text-sm text-foreground transition-colors duration-300 placeholder:text-muted-foreground focus:outline-none ${
              error ? "text-red-400" : ""
            }`}
          />

          <div className="group/btn absolute right-1.5 top-1/2 -translate-y-1/2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="relative flex h-8 cursor-pointer items-center gap-1.5 overflow-hidden bg-brand px-4 text-xs font-medium text-brand-foreground transition-colors duration-300 hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{copy.sending}</span>
                </>
              ) : (
                <>
                  <span>{copy.notify}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </>
              )}
            </button>
            <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-brand-foreground/30" />
            <span className="absolute bottom-0 left-0 h-1.5 w-1.5 border-b border-l border-brand-foreground/30" />
            <span className="absolute top-0 right-0 h-1.5 w-1.5 border-r border-t border-brand-foreground/30" />
            <span className="absolute top-0 left-0 h-1.5 w-1.5 border-l border-t border-brand-foreground/30" />
          </div>

          <CornerBrackets />
        </div>

        {error && (
          <p className="absolute -bottom-6 left-1 text-xs text-red-400 animate-slide-up">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
