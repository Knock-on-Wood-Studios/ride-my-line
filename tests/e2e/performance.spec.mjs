import { expect, test } from "@playwright/test";

test("the idle drawing screen renders on demand instead of looping continuously", async ({ page }) => {
  await page.goto("/?yard=1");
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => window.__RML_DEBUG.renderCount());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__RML_DEBUG.renderCount());
  expect(after - before).toBeLessThanOrEqual(1);
});

test("the canvas backing store respects the four-megapixel budget", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?yard=1");
  const pixels = await page.evaluate(() => window.__RML_DEBUG.backingPixels());
  expect(pixels).toBeLessThanOrEqual(4_010_000);
});

test("the simulation keeps rendering while a run is active", async ({ page }) => {
  await page.goto("/?yard=1&autoplay=1");
  await expect.poll(() => page.evaluate(() => window.__RML_DEBUG.state())).toBe("RUNNING");
  const before = await page.evaluate(() => window.__RML_DEBUG.renderCount());
  await expect.poll(
    () => page.evaluate(() => window.__RML_DEBUG.renderCount()),
    { timeout: 3_000, intervals: [100, 200, 300] }
  ).toBeGreaterThan(before + 5);
});

test("reduced-motion preference is applied at startup", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?yard=1");
  await expect(page.locator("body")).toHaveAttribute("data-reduced-motion", "true");
  expect(await page.evaluate(() => window.__RML_DEBUG.reducedMotion())).toBe(true);
});
