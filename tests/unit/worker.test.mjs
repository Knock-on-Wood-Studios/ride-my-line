import assert from "node:assert/strict";
import test from "node:test";
import worker from "../../worker.js";

function environment(points = []) {
  return {
    RML_ANALYTICS: {
      writeDataPoint(point) { points.push(point); }
    },
    ASSETS: {
      fetch() { return new Response("asset"); }
    }
  };
}

function eventRequest(events, origin = "https://ride.example") {
  return new Request(`${origin}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": origin,
      "Sec-Fetch-Site": "same-origin"
    },
    body: JSON.stringify({ events })
  });
}

test("the telemetry endpoint records only the documented aggregate schema", async () => {
  const points = [];
  const response = await worker.fetch(eventRequest([{
    name: "run_finished",
    yard: "yard-07",
    outcome: "fail",
    reason: "turtle",
    build: "abc123",
    input: "touch",
    attempt: 3,
    durationMs: 4321,
    inkPercent: 76,
    stars: 0,
    checkpoints: 2,
    email: "must-not-be-collected@example.com"
  }]), environment(points));
  assert.equal(response.status, 202);
  assert.equal(points.length, 1);
  assert.deepEqual(points[0].indexes, ["ride-my-line"]);
  assert.deepEqual(points[0].blobs, ["run_finished", "yard-07", "fail", "turtle", "abc123", "touch"]);
  assert.deepEqual(points[0].doubles, [1, 3, 4321, 76, 0, 2]);
  assert.doesNotMatch(JSON.stringify(points), /must-not-be-collected/);
});

test("cross-origin telemetry writes are rejected", async () => {
  const points = [];
  const request = eventRequest([{ name: "game_loaded" }]);
  request.headers.set("Origin", "https://attacker.example");
  const response = await worker.fetch(request, environment(points));
  assert.equal(response.status, 403);
  assert.equal(points.length, 0);
});

test("the health endpoint reports whether analytics is bound", async () => {
  const response = await worker.fetch(new Request("https://ride.example/api/health"), environment());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, analytics: true });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
