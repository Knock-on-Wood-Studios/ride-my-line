import { expect, test } from "@playwright/test";

test("the complete control surface fits a 320 by 568 viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/?yard=25");
  const layout = await page.evaluate(() => {
    const title = document.querySelector(".brand h1");
    const visibleButtons = [...document.querySelectorAll("button")].filter((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      titleFits: title.scrollWidth <= title.clientWidth,
      buttons: visibleButtons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      })
    };
  });
  expect(layout.horizontalOverflow).toBeLessThanOrEqual(0);
  expect(layout.titleFits).toBe(true);
  for (const button of layout.buttons) {
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.left).toBeGreaterThanOrEqual(0);
    expect(button.right).toBeLessThanOrEqual(320);
    expect(button.top).toBeGreaterThanOrEqual(0);
    expect(button.bottom).toBeLessThanOrEqual(568);
  }
});

test("the twenty-five-yard chooser scrolls within a short phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/?yard=1");
  await page.locator("#yardChip").click();
  await expect(page.locator("#yardList button[data-yard]")).toHaveCount(25);
  await expect(page.locator(".yard-section")).toHaveText(["OPENING RUN · 1–12", "MASTERY RUN · 13–25"]);
  const dimensions = await page.locator("#yardList").evaluate((list) => {
    const rect = list.getBoundingClientRect();
    return { bottom: rect.bottom, clientHeight: list.clientHeight, scrollHeight: list.scrollHeight, viewport: innerHeight };
  });
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(dimensions.bottom).toBeLessThanOrEqual(dimensions.viewport);
  await page.locator(".yard-reset").scrollIntoViewIfNeeded();
  await expect(page.locator(".yard-reset")).toBeVisible();
});
