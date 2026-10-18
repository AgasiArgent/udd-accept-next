import { test, expect } from "./fixtures";

test("note counter matches the number of listed notes @udd-1", async ({ page }) => {
  await page.goto("/app");
  const body = `udd-1 note ${Date.now()}`;
  await page.getByPlaceholder("New note").fill(body);
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("ul.notes li", { hasText: body })).toBeVisible();

  const count = await page.locator("ul.notes li").count();
  await expect(page.locator("header.bar strong")).toHaveText(`You have ${count} notes`);

  const item = page.locator("ul.notes li", { hasText: body });
  await item.getByRole("button", { name: "Delete" }).click();
  await expect(item).toHaveCount(0);
});
