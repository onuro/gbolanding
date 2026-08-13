import type { APIRoute } from "astro";

export const prerender = false;

// The voice API's CORS allowlist holds the production origins only, so a
// browser on localhost is refused before it ever sees a response. Forwarding
// from the dev server is server-to-server, where CORS does not apply.
const UPSTREAM = "https://kollektor.gbovision.com/gbo/session";

export const POST: APIRoute = async ({ request }) => {
  // Never a production route: there the browser talks to the API directly.
  if (!import.meta.env.DEV) {
    return new Response(JSON.stringify({ error: { message: "not_found" } }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
