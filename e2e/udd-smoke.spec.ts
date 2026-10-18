import { test, expect } from "./fixtures";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
});
