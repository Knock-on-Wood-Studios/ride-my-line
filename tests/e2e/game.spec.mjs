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
      const expectedTitle = yard === 25 ? "CROWNED" : yard === 12 ? "BOSS BEAT" : "MADE IT";
      expect(title, JSON.stringify(diagnostics)).toBe(expectedTitle);
      await expect(page.locator("#statScore")).not.toHaveText("0");
    });
  }
});

test.describe("prime-time progression flow", () => {
  test("a clear prioritizes the next yard and records a personal best", async ({ page }) => {
    await page.goto("/?yard=1&autoplay=1");
    await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#btnNext")).toHaveText("NEXT YARD");
    await expect(page.locator("#btnNext")).toHaveClass(/result-primary/);
    await expect(page.locator("#btnAgain")).toHaveText("REPLAY YARD");
    await expect(page.locator("#btnAgain")).toHaveClass(/result-secondary/);
    await expect(page.locator("#btnResetLine")).toBeHidden();
    await expect(page.locator("#resultRecord")).toContainText("NEW BEST");
    const best = await page.evaluate(() => JSON.parse(localStorage.getItem("kow.rideMyLine.bests") || "{}")["yard-01"]);
    expect(best.score).toBeGreaterThan(0);
    expect(best.timeMs).toBeGreaterThan(0);
    expect(best.inkPercent).toBeGreaterThan(0);
  });

  test("a failed run explains the recovery and separates retry from redraw", async ({ page }) => {
    await page.goto("/?yard=4&autoplay=1&pattern=swoop");
    await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#resultMessage")).not.toBeEmpty();
    await expect(page.locator("#btnAgain")).toHaveText("TRY SAME LINE");
    await expect(page.locator("#btnAgain")).toHaveClass(/result-primary/);
    await expect(page.locator("#btnResetLine")).toHaveText("REDRAW LINE");
    await expect(page.locator("#btnResetLine")).toHaveClass(/result-secondary/);
    await expect(page.locator("#btnNext")).toBeHidden();
  });

  test("the opening boss introduces the mastery run", async ({ page }) => {
    await page.goto("/?yard=12&autoplay=1");
    await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#resultTitle")).toHaveText("BOSS BEAT", { timeout: 20_000 });
    await expect(page.locator("#resultMessage")).toContainText("mastery yards");
    await expect(page.locator("#btnNext")).toHaveText("ENTER MASTERY RUN");
  });

  test("the final yard crowns the campaign", async ({ page }) => {
    await page.goto("/?yard=25&autoplay=1");
    await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#resultTitle")).toHaveText("CROWNED", { timeout: 20_000 });
    await expect(page.locator("#resultMessage")).toContainText("All 25 yards conquered");
    await expect(page.locator("#result .result-card")).toHaveClass(/campaign-complete/);
    await expect(page.locator("#btnAgain")).toHaveText("RIDE AGAIN");
  });
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
