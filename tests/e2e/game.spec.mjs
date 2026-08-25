import { expect, test } from "@playwright/test";

test.describe("authored campaign", () => {
  test.describe.configure({ mode: "parallel" });

  for (let yard = 1; yard <= 25; yard += 1) {
    test(`Yard ${yard} clears with its authored reference solution`, async ({ page }) => {
      await page.goto(`/?yard=${yard}&autoplay=1`);
      await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
      const title = await page.locator("#resultTitle").innerText();
      const diagnostics = await page.locator("body").evaluate((body) => ({
        result: body.dataset.lastResult,
        airMs: body.dataset.lastAirMs,
        maxSpeed: body.dataset.lastMaxSpeed,
        maxImpact: body.dataset.lastMaxImpact,
        checkpoints: body.dataset.lastCheckpoints,
        x: body.dataset.lastX,
        y: body.dataset.lastY
      }));
      expect(title, JSON.stringify(diagnostics)).toBe("MADE IT");
      await expect(page.locator("#statScore")).not.toHaveText("0");
    });
  }
});

test.describe("generic-move regression", () => {
  test.describe.configure({ mode: "parallel" });

  for (const yard of [4, 6, 8, 10, 12, 13, 15, 17, 19, 21, 23, 25]) {
    test(`the repeated swoop fails Yard ${yard}`, async ({ page }) => {
      await page.goto(`/?yard=${yard}&autoplay=1&pattern=swoop`);
      await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("#resultTitle")).not.toHaveText("MADE IT");
    });
  }
});
