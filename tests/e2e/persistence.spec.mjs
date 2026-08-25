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
    localStorage.setItem("kow.rideMyLine.unlocked", "999999");
    localStorage.setItem("kow.rideMyLine.lastYard", "missing-yard");
  });
  await page.goto("/?production=1");
  await expect(page.locator("#yardChip")).toHaveText("yard 1/12");
  await expect(page.locator("#game")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-storage", "available");
});
