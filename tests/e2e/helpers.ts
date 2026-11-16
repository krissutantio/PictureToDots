import type { Page } from "@playwright/test";
export async function step(page: Page, n: number) {
  if ((page.viewportSize()?.width || 1440) <= 900) {
    const tabs = page.locator(".mobile-workspace-tabs");
    if (await tabs.isVisible())
      await tabs.getByRole("button", { name: "Steps", exact: true }).click();
  }
  const button = page.locator(".step-toggle").nth(n - 1);
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
}
export async function studio(page: Page, which = 2) {
  await page.getByRole("button", { name: "Create", exact: true }).click();
  if ((page.viewportSize()?.width || 1440) > 900) await step(page, which);
  else
    await page
      .locator(".mobile-workspace-tabs")
      .getByRole("button", { name: "Colors & export", exact: true })
      .click();
}
