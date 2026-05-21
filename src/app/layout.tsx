import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GBO Vision | Enterprise AI Solutions",
  description:
    "Enterprise artificial intelligence from GBO Vision—including Kollektor, an autonomous agent for law firm debt collection, and Intelval, an AI-driven business and real estate valuation platform.",
  keywords: [
    "GBO Vision",
    "Enterprise AI",
    "AI Platforms",
    "Kollektor",
    "Intelval",
    "Debt Collection AI",
    "Real Estate Valuation",
    "Legal AI",
  ],
  authors: [{ name: "GBO Vision Team" }],
  openGraph: {
    title: "GBO Vision | Enterprise AI Solutions",
    description:
      "Enterprise artificial intelligence from GBO Vision—including Kollektor for law firm debt collection and Intelval for business and real estate valuation.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GBO Vision | Enterprise AI Solutions",
    description:
      "Enterprise artificial intelligence from GBO Vision—including Kollektor for law firm debt collection and Intelval for business and real estate valuation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-brand/25 selection:text-foreground">
        {children}
      </body>
    </html>
  );
}
