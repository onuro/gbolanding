import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, hasLocale, localeCookieName } from "@/i18n/config";

function preferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  if (hasLocale(cookieLocale ?? "")) {
    return cookieLocale;
  }

  const country = request.headers.get("x-vercel-ip-country");
  if (country?.toUpperCase() === "TR") {
    return "tr";
  }

  const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (acceptLanguage.startsWith("tr") || acceptLanguage.includes(",tr")) {
    return "tr";
  }

  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/en" ? "/" : pathname.replace(/^\/en/, "");
    return NextResponse.redirect(url);
  }

  if (pathname === "/tr" || pathname.startsWith("/tr/")) {
    requestHeaders.set("x-gbo-locale", "tr");
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    response.cookies.set(localeCookieName, "tr", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  }

  const locale = preferredLocale(request);
  if (pathname === "/" && locale === "tr") {
    const url = request.nextUrl.clone();
    url.pathname = "/tr";
    const response = NextResponse.redirect(url);
    response.cookies.set(localeCookieName, "tr", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  requestHeaders.set("x-gbo-locale", "en");
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (pathname === "/") {
    response.cookies.set(localeCookieName, "en", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
