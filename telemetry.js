/* Ride My Line — anonymous, first-party product telemetry. */
(function (root) {
  "use strict";

  var endpoint = "/api/events";
  var queue = [];
  var timer = 0;
  var sent = 0;
  var failures = 0;
  var enabled = navigator.doNotTrack !== "1" && navigator.globalPrivacyControl !== true;
  var allowedEvents = {
    game_loaded: true,
    yard_loaded: true,
    run_started: true,
    run_finished: true,
    campaign_completed: true,
    progress_reset: true,
    client_error: true
  };

  function buildVersion() {
    var meta = document.querySelector('meta[name="build-version"]');
    return meta ? meta.getAttribute("content") || "dev" : "dev";
  }

  function cleanNumber(value, minimum, maximum) {
    value = Number(value);
    if (!Number.isFinite(value)) return 0;
    return Math.max(minimum, Math.min(maximum, value));
  }

  function cleanText(value, fallback) {
    value = typeof value === "string" ? value : fallback;
    return value && /^[a-z0-9._-]{1,40}$/i.test(value) ? value : fallback;
  }

  function sanitize(name, data) {
    data = data || {};
    return {
      name: name,
      yard: cleanText(data.yard, "none"),
      outcome: cleanText(data.outcome, "none"),
      reason: cleanText(data.reason, "none"),
      build: cleanText(buildVersion(), "dev"),
      input: cleanText(data.input, "unknown"),
      attempt: Math.round(cleanNumber(data.attempt, 0, 999)),
      durationMs: Math.round(cleanNumber(data.durationMs, 0, 60000)),
      inkPercent: Math.round(cleanNumber(data.inkPercent, 0, 100)),
      stars: Math.round(cleanNumber(data.stars, 0, 3)),
      checkpoints: Math.round(cleanNumber(data.checkpoints, 0, 20))
    };
  }

  function transmit(useBeacon) {
    if (!enabled || !queue.length) return;
    var batch = queue.splice(0, 20);
    var body = JSON.stringify({ events: batch });
    if (useBeacon && navigator.sendBeacon) {
      if (navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }))) {
        sent += batch.length;
        return;
      }
    }
    root.fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      credentials: "omit",
      keepalive: true
    }).then(function (response) {
      if (!response.ok) failures += batch.length;
      else sent += batch.length;
    }).catch(function () {
      failures += batch.length;
    });
  }

  function schedule() {
    if (timer) return;
    timer = root.setTimeout(function () {
      timer = 0;
      transmit(false);
    }, 2200);
  }

  function track(name, data) {
    if (!enabled || !allowedEvents[name]) return;
    queue.push(sanitize(name, data));
    if (queue.length >= 5) transmit(false);
    else schedule();
  }

  root.addEventListener("error", function (event) {
    var source = event.filename ? event.filename.split("/").pop().split("?")[0] : "script";
    track("client_error", { reason: cleanText(source, "script-error") });
  });

  root.addEventListener("unhandledrejection", function () {
    track("client_error", { reason: "unhandled-rejection" });
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) transmit(true);
  });
  root.addEventListener("pagehide", function () { transmit(true); });

  root.RML_TELEMETRY = {
    track: track,
    flush: function () { transmit(false); },
    isEnabled: function () { return enabled; },
    debug: function () {
      return { enabled: enabled, queued: queue.length, sent: sent, failures: failures };
    }
  };
})(window);
