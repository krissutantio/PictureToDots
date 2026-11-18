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

test("Home deletes notebooks across reloads while preserving separately saved projects", async ({
  page,
  context,
}) => {
  const heading = (title: string) =>
    page.getByRole("heading", { name: title, exact: true });
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  const remove = async (title: string) => {
    page.once("dialog", (dialog) => dialog.accept());
    await button(`Delete notebook ${title}`).click();
    await expect(heading(title)).toHaveCount(0);
  };
  const create = async (title: string) => {
    await button("Create notebook").click();
    await page.getByLabel("Notebook title", { exact: true }).fill(title);
    await button("Home").click();
    await expect(heading(title)).toBeVisible();
  };

  await page.goto("/");
  await expect(heading("Little moments in color")).toBeVisible();
  // Recreate the preference layout from before the multi-notebook library.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("paper-pigment", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("preferences", "readwrite");
          const preferences = tx.objectStore("preferences");
          const legacy = preferences.get("notebook");
          legacy.onsuccess = () => {
            preferences.put(
              { ...legacy.result, title: "Legacy notebook" },
              "notebook",
            );
            preferences.delete("notebooks");
            preferences.delete("activeNotebook");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await expect(heading("Legacy notebook")).toBeVisible();

  await button("Create").click();
  await expect(button("Add to notebook")).toBeEnabled();
  await button("Save project").click();
  await expect(page.getByRole("status")).toHaveText(
    /Project saved on this device/,
  );
  await button("Add to notebook").click();
  await button("Home").click();
  await expect(
    page.locator(".notebook-card").filter({ has: heading("Legacy notebook") }),
  ).toContainText("1 page");
  await create("Keep notebook");
  await create("Active notebook");

  const confirmation = page.waitForEvent("dialog");
  const click = button("Delete notebook Legacy notebook").click();
  const prompt = await confirmation;
  const message = prompt.message();
  await prompt.dismiss();
  await click;
  expect(message).toContain("Legacy notebook” and all pages in it");
  expect(message).toContain("Separately saved projects will remain.");
  await expect(heading("Legacy notebook")).toBeVisible();

  await remove("Legacy notebook");
  await page.reload();
  await expect(heading("Active notebook")).toBeVisible();
  await expect(heading("Legacy notebook")).toHaveCount(0);
  await button("Notebook Builder").click();
  await expect(page.getByLabel("Notebook title", { exact: true })).toHaveValue(
    "Active notebook",
  );
  await button("Home").click();

  await remove("Active notebook");
  await page.reload();
  await expect(heading("Keep notebook")).toBeVisible();
  await expect(heading("Active notebook")).toHaveCount(0);
  await button("Notebook Builder").click();
  await expect(page.getByLabel("Notebook title", { exact: true })).toHaveValue(
    "Keep notebook",
  );
  await button("Home").click();

  await create("Surviving notebook");
  await button("Edit notebook Keep notebook").click();
  await expect(page.getByLabel("Notebook title", { exact: true })).toHaveValue(
    "Keep notebook",
  );
  await button("Home").click();
  const stale = await context.newPage();
  await stale.goto("/");
  await stale
    .getByRole("button", { name: "Notebook Builder", exact: true })
    .click();
  const staleTitle = stale.getByLabel("Notebook title", { exact: true });
  await expect(staleTitle).toHaveValue("Keep notebook");
  await remove("Keep notebook");
  await expect(heading("Your notebooks")).toBeFocused();
  await staleTitle.fill("Stale revision");
  await expect(stale.getByRole("alert")).toHaveText(
    /no longer in your local library/,
  );
  await expect(staleTitle).toHaveCount(0);
  await expect(
    stale.getByRole("heading", { name: "Surviving notebook", exact: true }),
  ).toBeVisible();
  await stale.close();

  await remove("Surviving notebook");
  await page.reload();
  await expect(
    page.getByText("No notebooks yet.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".notebook-card")).toHaveCount(0);
  await button("My Projects").click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(heading("Wildflower study")).toBeVisible();
  await button("Home").click();
  await create("New notebook after deletion");
  await page.reload();
  await expect(heading("New notebook after deletion")).toBeVisible();
  await expect(page.locator(".notebook-card")).toHaveCount(1);
});

test("mobile studio keeps the page fixed with reachable steps, preview and export panels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Delete notebook Little moments in color",
      exact: true,
    }),
  ).toBeInViewport();
  await page.screenshot({ path: "test-results/notebook-home-mobile.png" });
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
