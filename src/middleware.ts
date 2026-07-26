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

  const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (acceptLanguage.startsWith("tr") || acceptLanguage.includes(",tr")) {
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

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const target = pathname === "/en" ? "/" : pathname.replace(/^\/en/, "");
    return redirect(target);
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
    return redirect("/tr");
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
