import { test, expect } from "./fixtures";

test("blank note shows a message instead of failing silently @udd-3", async ({ page }) => {
  await page.goto("/app");
  const before = await page.locator("ul.notes li").count();
  await page.getByPlaceholder("New note").fill("   ");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("alert")).toContainText("type a note");
  await expect(page.locator("ul.notes li")).toHaveCount(before);
});
