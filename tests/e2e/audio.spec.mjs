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
  }, { timeout: 10_000 }).toBeGreaterThanOrEqual(20);
  const debug = await page.evaluate(() => window.__RML_AUDIO.debug());
  expect(debug.realAssets).toBe(true);
  expect(debug.audioProfile).toBe("backyard-slapstick-v2");
  expect(debug.failedSamples).toEqual([]);
});

test("rapid drawing and physics cues stay inside the intentional polyphony caps", async ({ page }) => {
  await page.goto("/?yard=1");
  const canvas = page.locator("#game");
  await canvas.focus();
  await canvas.press("Space");
  await expect.poll(async () => page.evaluate(() => window.__RML_AUDIO.debug().loadedSamples), {
    timeout: 10_000
  }).toBeGreaterThanOrEqual(20);

  const peak = await page.evaluate(async () => {
    for (let i = 0; i < 30; i += 1) window.__RML_AUDIO.play("pencil", 0.8);
    for (let i = 0; i < 12; i += 1) window.__RML_AUDIO.play("wind", 0.8);
    window.__RML_AUDIO.say("joy", 0.8);
    await new Promise((resolve) => setTimeout(resolve, 400));
    window.__RML_AUDIO.say("panic", 0.8);
    await new Promise((resolve) => setTimeout(resolve, 30));
    return window.__RML_AUDIO.debug();
  });

  expect(peak.activeRiderVoices).toBeLessThanOrEqual(1);
  expect(peak.activeSampleVoices).toBeLessThanOrEqual(4);
  expect(peak.failedSamples).toEqual([]);
});
