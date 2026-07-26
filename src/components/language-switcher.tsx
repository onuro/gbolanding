import { ChevronDown } from "lucide-react";

import type { Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  locale: Locale;
}

export default function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const handleChange = (nextLocale: Locale) => {
    document.cookie = `gbo_locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;

    const { pathname, search, hash } = window.location;
    const withoutLocalePrefix = pathname.startsWith("/tr")
      ? pathname.slice(3) || "/"
      : pathname;

    const targetPath =
      nextLocale === "tr"
        ? `/tr${withoutLocalePrefix === "/" ? "" : withoutLocalePrefix}`
        : withoutLocalePrefix;

    window.location.assign(`${targetPath}${search}${hash}`);
  };

  return (
    <label className="group relative w-fit">
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => handleChange(event.target.value as Locale)}
        className="relative flex h-8 cursor-pointer appearance-none items-center gap-1.5 overflow-hidden border border-dashed border-border bg-card px-4 pr-8 text-xs font-medium text-foreground/80 transition-colors duration-300 hover:bg-muted hover:text-foreground focus:outline-none"
      >
        <option value="en">EN</option>
        <option value="tr">TR</option>
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-foreground/80 transition-colors duration-300 group-hover:text-foreground" />
      <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
      <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
      <span className="absolute top-0 right-0 h-2 w-2 border-r border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
      <span className="absolute top-0 left-0 h-2 w-2 border-l border-t border-foreground/30 transition-colors duration-300 group-hover:border-foreground" />
    </label>
  );
}
