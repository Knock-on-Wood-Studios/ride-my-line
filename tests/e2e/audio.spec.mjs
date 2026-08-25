import { expect, test } from "@playwright/test";

test("the compact sound panel exposes independent accessible switches", async ({ page }) => {
  await page.goto("/?yard=1");
  await page.locator("#soundToggle").click();
  await expect(page.locator("#masterAudioToggle")).toBeFocused();
  await expect(page.locator("#musicToggle")).toHaveAttribute("role", "switch");
  await expect(page.locator("#musicToggle")).toHaveAttribute("aria-checked", "true");
  await page.locator("#voicesToggle").click();
  await expect(page.locator("#voicesToggle")).toHaveAttribute("aria-checked", "false");
  await page.locator("#masterAudioToggle").click();
  await expect(page.locator("#soundToggle")).toHaveText("SOUND OFF");
  await expect(page.locator("#masterAudioToggle")).toHaveAttribute("aria-checked", "false");
});

test("sound effects decode from real checked-in assets without synthesizer fallback", async ({ page }) => {
  await page.goto("/?yard=1");
  const canvas = page.locator("#game");
  await canvas.focus();
  await canvas.press("Space");
  await expect.poll(async () => {
    return page.evaluate(() => window.__RML_AUDIO.debug().loadedSamples);
  }, { timeout: 10_000 }).toBeGreaterThan(10);
  const debug = await page.evaluate(() => window.__RML_AUDIO.debug());
  expect(debug.realAssets).toBe(true);
  expect(debug.failedSamples).toEqual([]);
});
