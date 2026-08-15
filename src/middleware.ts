import { defineMiddleware } from "astro:middleware";

import { defaultLocale, hasLocale, localeCookieName } from "@/i18n/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function preferredLocale(request: Request, cookieValue?: string) {
  if (cookieValue && hasLocale(cookieValue)) {
    return cookieValue;
  }

  const country = request.headers.get("x-vercel-ip-country");
  if (country?.toUpperCase() === "TR") {
    return "tr" as const;
  }

  const acceptedLanguages = (
    request.headers.get("accept-language")?.toLowerCase() ?? ""
  )
    .split(",")
    .map((entry) => {
      const [language, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.split("=")[1] ?? "0")
        : 1;

      return { language, quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter(({ quality }) => quality > 0)
    .sort((a, b) => b.quality - a.quality);

  const preferredSupportedLanguage = acceptedLanguages.find(
    ({ language }) =>
      language === "tr" ||
      language.startsWith("tr-") ||
      language === "en" ||
      language.startsWith("en-"),
  )?.language;

  if (
    preferredSupportedLanguage === "tr" ||
    preferredSupportedLanguage?.startsWith("tr-")
  ) {
    return "tr" as const;
  }

  return defaultLocale;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, request, redirect, url } = context;
  const { pathname } = url;

  if (
    pathname.startsWith("/_astro") ||
    pathname.startsWith("/fonts") ||
    pathname.includes(".")
  ) {
    return next();
  }

  // Redirects are only ever moving a visitor between locales of the same page,
  // so the query has to come with them — otherwise campaign parameters, and
  // ?probe=1, are dropped on the way to /tr.
  const query = url.search;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const target = (pathname === "/en" ? "/" : pathname.replace(/^\/en/, "")) + query;
    cookies.set(localeCookieName, "en", {
      path: "/",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
    return redirect(target, 302);
  }

  if (pathname === "/tr" || pathname.startsWith("/tr/")) {
    cookies.set(localeCookieName, "tr", {
      path: "/",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
    return next();
  }

  const locale = preferredLocale(request, cookies.get(localeCookieName)?.value);

  if (pathname === "/" && locale === "tr") {
    cookies.set(localeCookieName, "tr", {
      path: "/",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
    return redirect(`/tr${query}`);
  }

  if (pathname === "/") {
    cookies.set(localeCookieName, "en", {
      path: "/",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return next();
});
