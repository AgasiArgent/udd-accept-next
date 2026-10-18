import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs";

// Signs in the test account once and saves the session. Credentials come from the environment only.
export default async function globalSetup(config: FullConfig) {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? config.projects[0].use.baseURL ?? "http://localhost:3000";
  const email = process.env.UDD_TEST_USER_EMAIL;
  const password = process.env.UDD_TEST_USER_PASSWORD;
  const statePath = "e2e/.auth/state.json";
  fs.mkdirSync("e2e/.auth", { recursive: true });
  if (!email || !password) {
    // No account: save an empty session so tests that need no login (the smoke test) still run.
    fs.writeFileSync(statePath, JSON.stringify({ cookies: [], origins: [] }));
    console.warn("UDD_TEST_USER_EMAIL / UDD_TEST_USER_PASSWORD not set: running signed out.");
    return;
  }
  const host = process.env.UDD_PREVIEW_HOST;
  const secret = process.env.UDD_PREVIEW_BYPASS;
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  // The bypass header goes only to the preview host, never to other hosts.
  if (host && secret) {
    await context.route(
      (u) => u.host === host,
      (r) => r.continue({ headers: { ...r.request().headers(), "x-vercel-protection-bypass": secret } }),
    );
  }
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/app");
  await context.storageState({ path: statePath });
  await browser.close();
}
