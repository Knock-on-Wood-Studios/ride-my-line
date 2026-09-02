import { expect, test } from "@playwright/test";

async function movePen(canvas, horizontalSteps, verticalSteps) {
  const horizontalKey = horizontalSteps < 0 ? "ArrowLeft" : "ArrowRight";
  const verticalKey = verticalSteps < 0 ? "ArrowUp" : "ArrowDown";
  let horizontal = Math.abs(horizontalSteps);
  let vertical = Math.abs(verticalSteps);
  while (horizontal || vertical) {
    if (horizontal) {
      await canvas.press(horizontalKey);
      horizontal -= 1;
    }
    if (vertical) {
      await canvas.press(verticalKey);
      vertical -= 1;
    }
  }
}

test("audio preferences survive a production-mode reload", async ({ page }) => {
  await page.goto("/?production=1");
  await page.locator("#soundToggle").click();
  await page.locator("#voicesToggle").click();
  await expect(page.locator("#voicesToggle")).toHaveAttribute("aria-checked", "false");
  await page.reload();
  await page.locator("#soundToggle").click();
  await expect(page.locator("#voicesToggle")).toHaveAttribute("aria-checked", "false");
});

test("a keyboard clear persists the next unlocked yard", async ({ page }) => {
  await page.goto("/?production=1");
  const canvas = page.locator("#game");
  await canvas.focus();
  await canvas.press("Space");
  await movePen(canvas, 5, 6);
  await movePen(canvas, 7, 12);
  await movePen(canvas, 6, 12);
  await movePen(canvas, 9, 12);
  await canvas.press("Space");
  await canvas.press("Enter");
  await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#resultTitle")).toHaveText("MADE IT", { timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("kow.rideMyLine.unlocked"))).toBe("2");
  await page.goto("/?production=1");
  await page.locator("#yardChip").click();
  await expect(page.locator('#yardList button[data-yard="1"]')).toBeEnabled();
});

test("corrupt saved values recover to a playable first yard", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kow.rideMyLine.medals", "not-json");
    localStorage.setItem("kow.rideMyLine.bests", "not-json");
    localStorage.setItem("kow.rideMyLine.unlocked", "999999");
    localStorage.setItem("kow.rideMyLine.lastYard", "missing-yard");
  });
  await page.goto("/?production=1");
  await expect(page.locator("#yardChip")).toHaveText("yard 1/25");
  await expect(page.locator("#game")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-storage", "available");
});

test("campaign reset clears personal records with medals and unlocks", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kow.rideMyLine.storageVersion", "3");
    localStorage.setItem("kow.rideMyLine.unlocked", "6");
    localStorage.setItem("kow.rideMyLine.medals", JSON.stringify({ "yard-01": 3 }));
    localStorage.setItem("kow.rideMyLine.bests", JSON.stringify({
      "yard-01": { score: 2010, timeMs: 1600, inkPercent: 62, medals: 3 }
    }));
  });
  await page.goto("/?production=1");
  await page.locator("#yardChip").click();
  const reset = page.locator(".yard-reset");
  await reset.click();
  await reset.click();
  const saved = await page.evaluate(() => ({
    medals: localStorage.getItem("kow.rideMyLine.medals"),
    bests: localStorage.getItem("kow.rideMyLine.bests"),
    unlocked: localStorage.getItem("kow.rideMyLine.unlocked")
  }));
  expect(saved).toEqual({ medals: "{}", bests: "{}", unlocked: "1" });
});
