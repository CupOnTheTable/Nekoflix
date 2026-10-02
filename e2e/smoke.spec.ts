import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads with anime content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Nekoflix/);
    await expect(page.locator("text=Watch Now").first()).toBeVisible({ timeout: 10000 });
  });

  test("navigation links work", async ({ page }) => {
    await page.goto("/");
    await page.click("text=Schedule");
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.locator("h1")).toContainText("Schedule");
  });
});

test.describe("Search", () => {
  test("search and filters work", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator('input[placeholder*="Search anime"]')).toBeVisible();
    await page.fill('input[placeholder*="Search anime"]', "attack on titan");
    await expect(page.locator("text=Attack on Titan").first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Anime detail", () => {
  test("detail page opens", async ({ page }) => {
    await page.goto("/search");
    await page.fill('input[placeholder*="Search anime"]', "demon slayer");
    await page.locator("text=Demon Slayer").first().click();
    await expect(page).toHaveURL(/\/anime\/\d+/);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

test.describe("Auth", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
