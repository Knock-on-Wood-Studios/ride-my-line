const EVENT_NAMES = new Set([
  "game_loaded",
  "yard_loaded",
  "run_started",
  "run_finished",
  "campaign_completed",
  "progress_reset",
  "client_error"
]);

function response(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "Content-Type": "application/json; charset=utf-8",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    }
  });
}

function safeText(value, fallback = "none") {
  return typeof value === "string" && /^[a-z0-9._-]{1,40}$/i.test(value) ? value : fallback;
}

function safeNumber(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(minimum, Math.min(maximum, number));
}

function dataPoint(event) {
  return {
    indexes: ["ride-my-line"],
    blobs: [
      safeText(event.name),
      safeText(event.yard),
      safeText(event.outcome),
      safeText(event.reason),
      safeText(event.build, "unknown"),
      safeText(event.input, "unknown")
    ],
    doubles: [
      1,
      safeNumber(event.attempt, 0, 999),
      safeNumber(event.durationMs, 0, 60000),
      safeNumber(event.inkPercent, 0, 100),
      safeNumber(event.stars, 0, 3),
      safeNumber(event.checkpoints, 0, 20)
    ]
  };
}

async function handleEvents(request, env) {
  const origin = request.headers.get("Origin");
  const site = request.headers.get("Sec-Fetch-Site");
  if (origin !== new URL(request.url).origin || (site && site !== "same-origin")) {
    return response(JSON.stringify({ error: "forbidden" }), 403);
  }
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return response(JSON.stringify({ error: "content-type" }), 415);
  }
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > 8192) return response(JSON.stringify({ error: "too-large" }), 413);

  let payload;
  try {
    const text = await request.text();
    if (text.length > 8192) return response(JSON.stringify({ error: "too-large" }), 413);
    payload = JSON.parse(text);
  } catch {
    return response(JSON.stringify({ error: "invalid-json" }), 400);
  }

  if (!Array.isArray(payload.events) || payload.events.length < 1 || payload.events.length > 20) {
    return response(JSON.stringify({ error: "invalid-events" }), 400);
  }

  let accepted = 0;
  for (const event of payload.events) {
    if (!event || !EVENT_NAMES.has(event.name)) continue;
    if (env.RML_ANALYTICS?.writeDataPoint) env.RML_ANALYTICS.writeDataPoint(dataPoint(event));
    accepted += 1;
  }
  return response(JSON.stringify({ accepted }), 202);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return response(JSON.stringify({ ok: true, analytics: !!env.RML_ANALYTICS }));
    }
    if (url.pathname === "/api/events" && request.method === "POST") {
      return handleEvents(request, env);
    }
    if (url.pathname.startsWith("/api/")) {
      return response(JSON.stringify({ error: "not-found" }), 404);
    }
    return env.ASSETS.fetch(request);
  }
};
