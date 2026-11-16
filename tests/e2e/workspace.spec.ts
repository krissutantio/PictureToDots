import { test, expect } from "@playwright/test";
import { studio, step } from "./helpers";

test("Home creates and reopens separate local notebooks; editor steps and page fit the viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your notebooks", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create notebook", exact: true })
    .click();
  await page
    .getByLabel("Notebook title", { exact: true })
    .fill("First notebook");
  await page
    .getByRole("button", {
      name: "Create a page for this notebook",
      exact: true,
    })
    .click();
  await expect(page.locator(".step-toggle").nth(0)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.locator(".step-toggle").nth(1)).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".step-toggle").nth(2)).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/astronaut.png");
  await page
    .getByRole("button", { name: "Keep current crop", exact: true })
    .click();
  await expect(page.locator(".step-toggle").nth(0)).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".step-toggle").nth(1)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Add to notebook", exact: true })
    .click();
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const bounds = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      client: innerHeight,
      width: document.documentElement.scrollWidth,
      clientWidth: innerWidth,
      paper: document.querySelector(".paper")!.getBoundingClientRect().bottom,
      workspace: document.querySelector(".workspace")!.getBoundingClientRect()
        .bottom,
    }));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
    expect(bounds.width).toBeLessThanOrEqual(bounds.clientWidth + 1);
    // ResizeObserver updates after layout; verify the complete fitted paper remains in the workspace.
    await expect
      .poll(async () =>
        page
          .locator(".paper")
          .evaluate(
            (node) =>
              node.getBoundingClientRect().bottom <=
              document.querySelector(".workspace")!.getBoundingClientRect()
                .bottom,
          ),
      )
      .toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/viewport-studio.png" });
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Create notebook", exact: true })
    .click();
  await page
    .getByLabel("Notebook title", { exact: true })
    .fill("Second notebook");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "First notebook", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Second notebook", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "First notebook", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit notebook First notebook", exact: true })
    .click();
  await expect(page.getByLabel("Notebook title", { exact: true })).toHaveValue(
    "First notebook",
  );
  await expect(page.getByLabel("Page 1 title", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.screenshot({ path: "test-results/notebook-home.png" });
});

test("mobile studio keeps the page fixed with reachable steps, preview and export panels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "New page", exact: true }).click();
  await expect(page.locator(".step-toggle").first()).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/astronaut.png");
  await page
    .getByRole("button", { name: "Keep current crop", exact: true })
    .click();
  await expect(page.locator(".step-toggle").nth(1)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(
    page.getByLabel("Conversion priority", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".mobile-workspace-tabs")
    .getByRole("button", { name: "Preview", exact: true })
    .click();
  await expect(page.locator(".paper")).toBeVisible();
  await expect(page.locator(".artwork [data-cell]").first()).toBeVisible();
  await expect
    .poll(async () =>
      page
        .locator(".paper")
        .evaluate((n) => n.getBoundingClientRect().bottom < innerHeight),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollHeight <= innerHeight + 1 &&
        document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile-workspace.png" });
  await page
    .locator(".mobile-workspace-tabs")
    .getByRole("button", { name: "Colors & export", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page
    .locator(".mobile-workspace-tabs")
    .getByRole("button", { name: "Steps", exact: true })
    .click();
  await page.locator(".step-toggle").nth(2).click();
  await expect(page.getByLabel("Dot diameter", { exact: true })).toBeVisible();
});
