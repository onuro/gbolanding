import { cookies, headers } from "next/headers";

import { defaultLocale, hasLocale, localeCookieName, type Locale } from "@/i18n/config";
import "./globals.css";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const localeFromHeader = headerStore.get("x-gbo-locale") ?? "";
  const localeFromCookie = cookieStore.get(localeCookieName)?.value ?? "";

  let lang: Locale = defaultLocale;
  if (hasLocale(localeFromHeader)) {
    lang = localeFromHeader;
  } else if (hasLocale(localeFromCookie)) {
    lang = localeFromCookie;
  }

  return (
    <html lang={lang} className="dark h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-brand/25 selection:text-foreground">
        {children}
      </body>
    </html>
  );
}
