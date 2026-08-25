import { expect, test } from "@playwright/test";

test.describe("authored campaign", () => {
  test.describe.configure({ mode: "parallel" });

  for (let yard = 1; yard <= 12; yard += 1) {
    test(`Yard ${yard} clears with its authored reference solution`, async ({ page }) => {
      await page.goto(`/?yard=${yard}&autoplay=1`);
      await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("#resultTitle")).toHaveText("MADE IT");
      await expect(page.locator("#statScore")).not.toHaveText("0");
    });
  }
});

test("the repeated generic swoop does not clear the advanced campaign", async ({ page }) => {
  const outcomes = [];
  for (const yard of [4, 6, 8, 10, 12]) {
    await page.goto(`/?yard=${yard}&autoplay=1&pattern=swoop`);
    await expect(page.locator("#result")).toBeVisible({ timeout: 20_000 });
    outcomes.push(await page.locator("#resultTitle").innerText());
  }
  expect(outcomes).not.toContain("MADE IT");
});
