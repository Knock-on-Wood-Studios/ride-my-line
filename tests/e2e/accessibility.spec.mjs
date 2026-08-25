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

test("the game exposes zoom, canvas instructions, and accessible ink state", async ({ page }) => {
  await page.goto("/?yard=1");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale");
  await expect(page.locator("#game")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#game")).toHaveAttribute("aria-describedby", /gameInstructions/);
  await expect(page.locator("#inkTrack")).toHaveAttribute("role", "progressbar");
  await expect(page.locator("#inkTrack")).toHaveAttribute("aria-valuenow", "100");
});

test("the yard picker uses native buttons and moves focus predictably", async ({ page }) => {
  await page.goto("/?yard=1");
  await page.locator("#yardChip").click();
  const current = page.locator("#yardList button.current");
  await expect(current).toBeFocused();
  await expect(current).toHaveAttribute("aria-current", "step");
  await current.press("ArrowDown");
  await expect(page.locator('#yardList button[data-yard="1"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#yardChip")).toBeFocused();
});

test("campaign progress reset requires an explicit second action", async ({ page }) => {
  await page.goto("/?yard=6");
  await page.locator("#yardChip").click();
  const reset = page.locator(".yard-reset");
  await reset.click();
  await expect(reset).toHaveText("CONFIRM RESET");
  await expect(page.locator("#yardChip")).toHaveText("yard 6/25");
  await reset.click();
  await expect(page.locator("#yardChip")).toHaveText("yard 1/25");
  await page.locator("#yardChip").click();
  await expect(page.locator('#yardList button[data-yard="1"]')).toBeDisabled();
});

test("the result dialog owns focus and makes the game background inert", async ({ page }) => {
  await page.goto("/?yard=1&autoplay=1");
  const result = page.locator("#result");
  await expect(result).toBeVisible({ timeout: 20_000 });
  await expect(result).toBeFocused();
  await expect(result).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#game")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#hud")).toHaveAttribute("aria-hidden", "true");
  await result.press("Tab");
  await expect(page.locator("#btnAgain")).toBeFocused();
});

test("keyboard drawing changes the line and starts a run without pointer input", async ({ page }) => {
  await page.goto("/?yard=1");
  const canvas = page.locator("#game");
  await canvas.focus();
  await canvas.press("Space");
  await canvas.press("Shift+ArrowRight");
  await canvas.press("Shift+ArrowRight");
  await canvas.press("Shift+ArrowDown");
  await canvas.press("Shift+ArrowDown");
  await canvas.press("Space");
  await expect(page.locator("#inkTrack")).not.toHaveAttribute("aria-valuenow", "100");
  await canvas.press("Enter");
  await expect(page.locator("#hint")).toHaveText("hang on");
});

test("Yard 1 can be completed with the keyboard-only drawing path", async ({ page }) => {
  await page.goto("/?yard=1");
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
  await expect(page.locator("#resultTitle")).toHaveText("MADE IT");
});
