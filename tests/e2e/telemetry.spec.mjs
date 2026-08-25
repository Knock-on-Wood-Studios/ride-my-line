import { expect, test } from "@playwright/test";

test("gameplay emits bounded first-party events without identity or browsing data", async ({ page }) => {
  const batches = [];
  await page.route("**/api/events", async (route) => {
    batches.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":1}' });
  });
  await page.goto("/?yard=1&autoplay=1");
  await expect.poll(() => batches.length, { timeout: 10_000 }).toBeGreaterThan(0);
  const events = batches.flatMap((batch) => batch.events || []);
  expect(events.some((event) => event.name === "yard_loaded")).toBe(true);
  expect(events.some((event) => event.name === "run_started")).toBe(true);
  const serialized = JSON.stringify(events);
  expect(serialized).not.toMatch(/session|referrer|userAgent|email|url/i);
});
