"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  locale: Locale;
}

export default function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (nextLocale: Locale) => {
    document.cookie = `gbo_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;

    const currentPath = pathname || "/";
    const withoutLocalePrefix = currentPath.startsWith("/tr")
      ? currentPath.slice(3) || "/"
      : currentPath;

    const targetPath =
      nextLocale === "tr"
        ? `/tr${withoutLocalePrefix === "/" ? "" : withoutLocalePrefix}`
        : withoutLocalePrefix;

    const query = searchParams.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const href = `${targetPath}${query ? `?${query}` : ""}${hash}`;
    router.push(href);
  };

  return (
    <label className="relative">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => handleChange(event.target.value as Locale)}
        className="h-8 cursor-pointer border border-border bg-card px-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors duration-300 hover:text-foreground focus:outline-none"
      >
        <option value="en">EN</option>
        <option value="tr">TR</option>
      </select>
    </label>
  );
}
