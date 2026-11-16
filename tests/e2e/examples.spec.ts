import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
test("generate four original sample projects and printable examples", async ({
  page,
}) => {
  await mkdir("examples", { recursive: true });
  await page.goto("/");
  for (const name of ["flowers", "portrait", "animal", "landscape"]) {
    await page
      .getByRole("button", { name: `Load ${name} sample`, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Download PDF", exact: true }),
    ).toBeEnabled();
    for (const [mode, button] of [
      ["dots", "Dot Art"],
      ["lines", "Line Art"],
    ]) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Download PDF", exact: true }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Template", exact: true }).click();
      for (const [label, ext] of [
        ["SVG", "svg"],
        ["Download PDF", "pdf"],
      ]) {
        const pending = page.waitForEvent("download");
        await page.getByRole("button", { name: label, exact: true }).click();
        await (
          await pending
        ).saveAs(resolve(`examples/${name}-${mode}.${ext}`));
      }
      await page.getByRole("button", { name: "Colored", exact: true }).click();
      const pending = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "PNG · 300 dpi", exact: true })
        .click();
      await (
        await pending
      ).saveAs(resolve(`examples/${name}-${mode}-colored.png`));
    }
    await page
      .getByRole("button", { name: "Save project", exact: true })
      .click();
    await page
      .getByRole("button", { name: "My Projects", exact: true })
      .click();
    const card = page.locator(".project-card").filter({
      has: page.getByRole("heading", { name: new RegExp(name, "i") }),
    });
    const pending = page.waitForEvent("download");
    await card.getByTitle("Export project backup").click();
    await (await pending).saveAs(resolve(`examples/${name}-project.json`));
    await page.getByRole("button", { name: "Create", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Load flowers sample", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  const dismiss = page.getByRole("button", { name: "Dismiss message" });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.screenshot({
    path: "examples/studio-desktop.png",
    fullPage: true,
  });
});
