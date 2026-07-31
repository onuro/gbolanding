import type { APIRoute } from "astro";

export const prerender = false;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  if (typeof payload.company === "string" && payload.company.trim()) {
    return json({ ok: true }, 201);
  }

  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const locale = payload.locale === "tr" ? "tr" : "en";
  const source =
    typeof payload.source === "string"
      ? payload.source.slice(0, 80)
      : "homepage";

  if (!emailPattern.test(email) || email.length > 254) {
    return json({ error: "invalid_email" }, 422);
  }

  const webhookUrl = import.meta.env.WAITLIST_WEBHOOK_URL;
  if (!webhookUrl) {
    return json({ error: "service_unavailable" }, 503);
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (import.meta.env.WAITLIST_WEBHOOK_TOKEN) {
      headers.Authorization = `Bearer ${import.meta.env.WAITLIST_WEBHOOK_TOKEN}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        locale,
        source,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return json({ error: "upstream_error" }, 502);
    }

    return json({ ok: true }, 201);
  } catch {
    return json({ error: "upstream_unavailable" }, 502);
  }
};

export const ALL: APIRoute = () => json({ error: "method_not_allowed" }, 405);
