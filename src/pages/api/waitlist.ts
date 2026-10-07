import type { APIRoute } from "astro";
import { serverEnv } from "@/lib/server-env";

export const prerender = false;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_TO = "onur@gbovision.com";
const DEFAULT_FROM = "GBO Vision Web <web@gbovision.com>";
const UPSTREAM_TIMEOUT_MS = 10_000;
const productNames: Record<string, string> = {
  kollektor: "Kollektor",
  intelval: "Intelval",
  hastam: "Hastam",
  fountible: "Fountible",
  custom: "Özel yazılım",
};

const json = (body: Record<string, unknown>, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

export const POST: APIRoute = async ({ request }) => {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) {
    return json({ error: "payload_too_large" }, 413);
  }

  let payload: {
    email?: unknown;
    locale?: unknown;
    source?: unknown;
    company?: unknown;
  };

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      payload = {
        email: formData.get("email"),
        locale: formData.get("locale"),
        source: formData.get("source"),
        company: formData.get("company"),
      };
    }
  } catch {
    return json({ error: "invalid_payload" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "invalid_payload" }, 400);
  }

  if (typeof payload.company === "string" && payload.company.trim()) {
    return json({ ok: true }, 201);
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const locale = payload.locale === "tr" ? "tr" : "en";
  const source =
    (typeof payload.source === "string"
      ? payload.source.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim().slice(0, 80)
      : "") || "homepage";

  if (!emailPattern.test(email) || email.length > 254) {
    return json({ error: "invalid_email" }, 422);
  }

  const resendKey = serverEnv("RESEND_API_KEY");
  const webhookUrl = serverEnv("WAITLIST_WEBHOOK_URL");
  if (!resendKey && !webhookUrl) {
    return json({ error: "service_unavailable" }, 503);
  }

  const submittedAt = new Date();
  try {
    if (resendKey) {
      const to = (serverEnv("CONTACT_TO") ?? DEFAULT_TO)
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean);
      const from = serverEnv("CONTACT_FROM") ?? DEFAULT_FROM;
      const productKey = source.split(":").at(-1) ?? "";
      const product = Object.hasOwn(productNames, productKey)
        ? productNames[productKey]
        : undefined;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          reply_to: email,
          subject: product ? `Demo talebi: ${product}` : "Yeni demo talebi",
          text: [
            "gbovision.com üzerinden yeni bir demo talebi geldi.",
            "",
            `E-posta: ${email}`,
            `İlgilendiği çözüm: ${product ?? "Belirtilmedi"}`,
            `Kaynak: ${source}`,
            `Dil: ${locale === "tr" ? "Türkçe" : "İngilizce"}`,
            `Tarih: ${submittedAt.toISOString()}`,
            "",
            "Bu e-postayı yanıtladığınızda yanıtınız talebi gönderen kişiye gider.",
          ].join("\n"),
        }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.error(`[waitlist] Resend answered ${response.status}`);
        return json({ error: "upstream_error" }, 502);
      }
      return json({ ok: true }, 201);
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const webhookToken = serverEnv("WAITLIST_WEBHOOK_TOKEN");
    if (webhookToken) {
      headers.Authorization = `Bearer ${webhookToken}`;
    }

    const response = await fetch(webhookUrl as string, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        locale,
        source,
        submittedAt: submittedAt.toISOString(),
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[waitlist] Webhook answered ${response.status}`);
      return json({ error: "upstream_error" }, 502);
    }

    return json({ ok: true }, 201);
  } catch {
    console.error("[waitlist] Delivery service could not be reached");
    return json({ error: "upstream_unavailable" }, 502);
  }
};

export const ALL: APIRoute = () => json({ error: "method_not_allowed" }, 405);
