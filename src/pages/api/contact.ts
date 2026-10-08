import type { APIRoute } from "astro";
import { pathFor } from "@/i18n/routes";
import {
  contactFallback,
  contactLimits,
  honeypotField,
  validateContact,
  type ContactOutcome,
  type ContactProduct,
  type ContactSubmission,
} from "@/lib/contact";
import { serverEnv } from "@/lib/server-env";

// The contact form on /contact and /en/contact posts here. A valid message is
// e-mailed through Resend when RESEND_API_KEY is set, or forwarded to the
// waitlist webhook when only that is set. With neither, the endpoint answers
// 503 and the page says honestly that messages cannot be sent right now.
// The page's script posts JSON and gets JSON back; a plain form post (no
// JavaScript) gets the same outcome as a 303 back to the page.
//
// The recipient is a secret: it lives only in this server-side file and in the
// CONTACT_TO environment variable. No response, log line or page ever carries
// it, and the provider's error body is never passed back (it can echo it).

export const prerender = false;

// Every setting is read per request through serverEnv: process.env in
// production, plus the local `.env` under `astro dev`. Nothing here is baked
// into the build, so a key can be rotated in Vercel without a redeploy. This
// file must never read Vite's build-time env object directly: that would
// inline the value (src/lib/server-env.ts says why).
//
// CONTACT_TO may list several addresses, separated by commas.
const DEFAULT_TO = "onur@gbovision.com";
const DEFAULT_FROM = "GBO Vision Web <web@gbovision.com>";

function mailConfig() {
  const apiKey = serverEnv("RESEND_API_KEY");
  const to = (serverEnv("CONTACT_TO") ?? DEFAULT_TO)
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);
  const from = serverEnv("CONTACT_FROM") ?? DEFAULT_FROM;
  return { apiKey, to, from };
}

// The waitlist's webhook and token, the same variables /api/waitlist uses.
function webhookConfig() {
  return {
    url: serverEnv("WAITLIST_WEBHOOK_URL"),
    token: serverEnv("WAITLIST_WEBHOOK_TOKEN"),
  };
}

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

// A plain form post: the browser sent the form itself, because JavaScript is
// off, the page script failed to load or the visitor was faster than it. The
// page's script always sends JSON.
const isFormPost = (request: Request) => {
  const type = request.headers.get("content-type") ?? "";
  return (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  );
};

// The page a form post came from: its hidden locale field, or the Referer
// when the body was never read, or Turkish.
function pageLocale(payload: Record<string, unknown> | null, request: Request) {
  if (payload?.locale === "en") return "en";
  if (payload?.locale === "tr") return "tr";
  try {
    const referer = request.headers.get("referer");
    if (referer && /^\/en(\/|$)/.test(new URL(referer).pathname)) return "en";
  } catch {
    // A malformed Referer: fall through to Turkish.
  }
  return "tr";
}

// 303 back to the contact page, at the fragment that names the outcome. The
// page shows that state without JavaScript (src/lib/contact.ts, contactFallback).
const backToPage = (locale: "tr" | "en", outcome: ContactOutcome) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: `${pathFor("contact", locale)}#${contactFallback[outcome]}`,
      "Cache-Control": "no-store",
    },
  });

// ---- Rate limit ----------------------------------------------------------------
// Five messages per address per ten minutes. The map lives in one serverless
// instance, so this slows a script down rather than stopping a determined one;
// the honeypot and the provider's own limits do the rest.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const RATE_KEYS_MAX = 2000;
const recent = new Map<string, number[]>();

function rateLimited(key: string, now: number) {
  const hits = (recent.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    recent.set(key, hits);
    return true;
  }
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > RATE_KEYS_MAX) {
    for (const [stale, times] of recent) {
      if (times.every((time) => now - time >= RATE_WINDOW_MS)) recent.delete(stale);
    }
    // Still full of live keys: drop the oldest entries rather than grow forever.
    while (recent.size > RATE_KEYS_MAX) {
      const oldest = recent.keys().next().value;
      if (oldest === undefined) break;
      recent.delete(oldest);
    }
  }
  return false;
}

// Astro's clientAddress is a getter that throws where the adapter cannot tell,
// so it is read inside the try, never destructured.
function clientKey(context: { request: Request; clientAddress: string }) {
  const forwarded = context.request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  if (forwarded) return forwarded;
  try {
    return context.clientAddress || "unknown";
  } catch {
    return "unknown";
  }
}

// ---- Message -------------------------------------------------------------------
const productNames: Record<ContactProduct, string> = {
  kollektor: "Kollektor",
  intelval: "Intelval",
  hastam: "Hastam",
  fountible: "Fountible",
  custom: "Özel yazılım",
};

const topicName = (product: ContactProduct | null) =>
  product ? productNames[product] : "Genel";

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** "Web sitesi mesajı: Kollektor · Ayşe Yılmaz" */
const subjectFor = (data: ContactSubmission) =>
  `Web sitesi mesajı: ${topicName(data.product)} · ${clip(data.name, 80)}`;

function textFor(data: ContactSubmission, locale: "tr" | "en", submittedAt: Date) {
  const when = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(submittedAt);
  const page = locale === "tr" ? "Türkçe sayfa (/contact)" : "İngilizce sayfa (/en/contact)";

  return [
    "gbovision.com iletişim formundan yeni bir mesaj geldi.",
    "",
    `Ad soyad: ${data.name}`,
    `E-posta: ${data.email}`,
    `Telefon: ${data.phone}`,
    `Şirket: ${data.company || "Belirtilmedi"}`,
    `Konu: ${topicName(data.product)}`,
    `Gönderildiği sayfa: ${page}`,
    `Tarih: ${when} (İstanbul saati)`,
    "",
    "Mesaj:",
    data.message,
    "",
    "--",
    "Bu e-postayı yanıtladığınızda yanıtınız doğrudan gönderene gider.",
  ].join("\n");
}

// ---- Delivery ------------------------------------------------------------------
const UPSTREAM_TIMEOUT_MS = 10_000;

type Delivery = "sent" | "upstream_error" | "upstream_unavailable";

async function sendWithResend(
  config: { apiKey: string; to: string[]; from: string },
  data: ContactSubmission,
  locale: "tr" | "en",
  submittedAt: Date,
): Promise<Delivery> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        reply_to: data.email,
        subject: subjectFor(data),
        text: textFor(data, locale, submittedAt),
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) {
      // The status only: Resend's error body can quote the recipient.
      console.error(`[contact] Resend answered ${response.status}`);
      return "upstream_error";
    }
    return "sent";
  } catch {
    console.error("[contact] Resend could not be reached");
    return "upstream_unavailable";
  }
}

async function sendToWebhook(
  config: { url: string; token?: string },
  data: ContactSubmission,
  locale: "tr" | "en",
  submittedAt: Date,
): Promise<Delivery> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source: "contact-page",
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        product: data.product,
        message: data.message,
        locale,
        submittedAt: submittedAt.toISOString(),
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[contact] Webhook answered ${response.status}`);
      return "upstream_error";
    }
    return "sent";
  } catch {
    console.error("[contact] Webhook could not be reached");
    return "upstream_unavailable";
  }
}

// ---- Route ---------------------------------------------------------------------
async function readPayload(request: Request): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > contactLimits.bodyMaxBytes) {
      throw new RangeError("payload_too_large");
    }
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  }

  if (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const payload: Record<string, unknown> = {};
    for (const key of ["name", "email", "phone", "company", "product", "message", "locale", honeypotField]) {
      const value = form.get(key);
      if (typeof value === "string") payload[key] = value;
    }
    return payload;
  }

  return null;
}

export const POST: APIRoute = async (context) => {
  const { request } = context;
  const formPost = isFormPost(request);
  let payload: Record<string, unknown> | null = null;

  // The script gets JSON; a plain form post goes back to the page, which
  // shows the same outcome without JavaScript.
  const reply = (outcome: ContactOutcome, body: Record<string, unknown>, status: number) =>
    formPost ? backToPage(pageLocale(payload, request), outcome) : json(body, status);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > contactLimits.bodyMaxBytes) {
    return reply("invalid", { error: "payload_too_large" }, 413);
  }

  try {
    payload = await readPayload(request);
  } catch (error) {
    if (error instanceof RangeError) {
      return reply("invalid", { error: "payload_too_large" }, 413);
    }
    return reply("invalid", { error: "invalid_payload" }, 400);
  }
  if (!payload) return reply("invalid", { error: "invalid_payload" }, 400);

  // A bot filled the field people never see. Answer as if it worked, so it
  // has no reason to try again, and send nothing.
  const trap = payload[honeypotField];
  if (typeof trap === "string" && trap.trim()) {
    return reply("sent", { ok: true }, 201);
  }

  const result = validateContact(payload);
  if (!result.ok) {
    return reply("invalid", { error: "invalid_fields", fields: result.errors }, 422);
  }

  const locale = payload.locale === "en" ? "en" : "tr";
  const mail = mailConfig();
  const webhook = webhookConfig();
  if (!mail.apiKey && !webhook.url) {
    return reply("unavailable", { error: "service_unavailable" }, 503);
  }

  if (rateLimited(clientKey(context), Date.now())) {
    return reply("rateLimited", { error: "rate_limited" }, 429);
  }

  const submittedAt = new Date();
  const delivery = mail.apiKey
    ? await sendWithResend(
        { apiKey: mail.apiKey, to: mail.to, from: mail.from },
        result.data,
        locale,
        submittedAt,
      )
    : await sendToWebhook(
        { url: webhook.url as string, token: webhook.token },
        result.data,
        locale,
        submittedAt,
      );

  if (delivery !== "sent") return reply("submission", { error: delivery }, 502);
  return reply("sent", { ok: true }, 201);
};

export const ALL: APIRoute = () => json({ error: "method_not_allowed" }, 405);
