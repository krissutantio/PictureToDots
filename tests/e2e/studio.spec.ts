import { test, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
test("full local workflow: modes, edits, saving and all exports", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r.url().startsWith("http://127.0.0.1") &&
      !r.url().startsWith("data:") &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("[data-cell]").first()).toBeVisible();
  const count = await page.locator("[data-cell]").count();
  await page.getByLabel("Difficulty", { exact: true }).selectOption("Beginner");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  expect(await page.locator("[data-cell]").count()).toBe(count);
  await page.getByRole("button", { name: "Template", exact: true }).click();
  await page.locator(".legend button").first().click();
  await page.locator("[data-cell]").nth(30).click();
  await expect(page.getByRole("button", { name: "Undo edit" })).toBeEnabled();
  await page.getByRole("button", { name: "Undo edit" }).click();
  await page.getByRole("button", { name: "Redo edit" }).click();
  await page.getByRole("button", { name: "Line Art", exact: true }).click();
  await expect(page.locator("[data-region]").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Coloring style").selectOption("traditional");
  await expect(page.locator("[data-region] text")).toHaveCount(0);
  await page.getByRole("button", { name: "Dot Art", exact: true }).click();
  await expect(page.getByLabel("Grid resolution")).toHaveValue("36");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Wildflower study" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Wildflower study" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  for (const name of [
    "Download PDF",
    "SVG",
    "PNG · 300 dpi",
    "Download color key",
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const d = await pending;
    const path = await d.path();
    expect((await readFile(path!)).length).toBeGreaterThan(100);
  }
  await page
    .getByRole("button", { name: "Add to notebook", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Notebook Builder", exact: true })
    .click();
  await expect(page.getByLabel("Page 1 title")).toBeVisible();
  await page
    .getByRole("button", { name: "Duplicate page 1", exact: true })
    .click();
  await page.getByLabel("Page 2 title").fill("Second page");
  await page
    .getByRole("button", { name: "Move page 2 up", exact: true })
    .click();
  await expect(page.getByLabel("Page 1 title")).toHaveValue("Second page");
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download manufacturing ZIP" })
    .click();
  const d = await pending;
  await mkdir("examples", { recursive: true });
  await d.saveAs("examples/notebook-manufacturing.zip");
  const zip = await JSZip.loadAsync(await readFile((await d.path())!));
  expect(Object.keys(zip.files)).toHaveLength(10);
  const pdf = await PDFDocument.load(
    await zip.file("interior_print_ready.pdf")!.async("uint8array"),
  );
  expect(pdf.getPageCount()).toBe(2);
  expect(pdf.getPage(0).getSize()).toEqual({ width: 360, height: 504 });
  const backup = JSON.parse(await zip.file("project.json")!.async("string"));
  expect(backup.notebook.pages[0].title).toBe("Second page");
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
test("mobile layout and marker management", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Marker Sets", exact: true }).click();
  await page.getByRole("button", { name: "Add a marker", exact: true }).click();
  await expect(page.getByLabel("Marker 19 name", { exact: true })).toHaveValue(
    "My marker",
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Blank calibration chart", exact: true })
    .click();
  expect((await pending).suggestedFilename()).toBe(
    "marker-swatch-calibration.pdf",
  );
});
test("uploads a local photo and round-trips a project backup", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  const source = await page.locator(".upload-card img").getAttribute("src");
  const bytes = Buffer.from(source!.split(",")[1], "base64");
  await page.locator("input[type=file]").nth(0).setInputFiles({
    name: "my-local-photo.png",
    mimeType: "image/png",
    buffer: bytes,
  });
  await expect(page.getByLabel("Artwork title")).toHaveValue("my-local-photo");
  if (await page.getByRole("dialog").count())
    await page
      .getByRole("button", { name: "Keep current crop", exact: true })
      .click();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByTitle("Export project backup").click();
  const download = await pending;
  const json = await readFile((await download.path())!);
  await page.locator("input[type=file]").nth(1).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: json,
  });
  await expect(page.getByLabel("Artwork title")).toHaveValue("my-local-photo");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
});

test("merged regions survive import, label changes, save and reopen", async ({
  page,
}) => {
  const { defaults } = await import("../../src/types");
  const { regionsFor } = await import("../../src/processing");
  const palette = JSON.parse(await readFile("src/palettes.json", "utf8"));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  const source = await page.locator(".upload-card img").getAttribute("src");
  const assignments = Array(96 * 112).fill(0);
  const project = {
    version: 1,
    id: "merged-regression",
    title: "Merged region test",
    image: source,
    settings: { ...defaults, mode: "lines" },
    palette,
    edits: {},
    updated: Date.now(),
    art: {
      mode: "lines",
      width: 96,
      height: 112,
      palette: [palette.markers[0]],
      assignments,
      regions: regionsFor(assignments, 96, 112),
    },
  };
  await page
    .locator("input[type=file]")
    .nth(1)
    .setInputFiles({
      name: "merged.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await expect(page.locator("[data-region]")).toHaveCount(1);
  await page.getByLabel("Coloring style").selectOption("traditional");
  await expect(page.locator("[data-region]")).toHaveCount(1);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.locator("[data-region]")).toHaveCount(1);
  await expect(page.locator("[data-region] text")).toHaveCount(0);
});
