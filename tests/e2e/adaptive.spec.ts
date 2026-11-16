import { studio, step } from "./helpers";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

test("adaptive letters, all 60 colors, edits and exports survive backups", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await studio(page);
  const pdfButton = page.getByRole("button", {
    name: "Download PDF",
    exact: true,
  });
  await expect(pdfButton).toBeEnabled();
  await expect(page.getByLabel("Maximum colors", { exact: true })).toHaveValue(
    "60",
  );
  await page.getByRole("button", { name: "Marker Sets", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Enable / })).toHaveCount(60);
  await expect(
    page.getByText("All 60 enabled swatches", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const originalCount = await page.locator(".artwork [data-cell]").count();
  await page.getByRole("button", { name: /Advanced settings/ }).click();
  await page.getByLabel("Dot diameter", { exact: true }).fill("3.2");
  await step(page, 2);
  await page
    .getByLabel("Letter placement", { exact: true })
    .selectOption("adaptive");
  await page.getByRole("button", { name: "Template", exact: true }).click();
  await expect(pdfButton).toBeEnabled();
  const positions = () =>
    page
      .locator(".artwork [data-cell] circle")
      .evaluateAll((nodes) =>
        nodes.map((n) => [
          n.parentElement!.getAttribute("data-cell"),
          n.getAttribute("cx"),
          n.getAttribute("cy"),
          n.getAttribute("r"),
        ]),
      );
  const before = await positions();
  expect(before.length).toBeGreaterThan(100);
  expect(before.length).toBeGreaterThan(100);
  expect(new Set(before.map((p) => p[3])).size).toBeGreaterThan(1);
  const sizes = await page
    .locator(".artwork [data-cell] text")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("font-size")));
  expect(new Set(sizes).size).toBeGreaterThan(1);
  await page.locator(".legend button").last().click();
  await page.locator(".artwork [data-cell]").first().click();
  await expect(
    page.getByRole("button", { name: "Undo edit", exact: true }),
  ).toBeEnabled();
  expect(await positions()).toEqual(before);
  await expect(page.locator(".artwork [data-cell] text").first()).toHaveText(
    "BH",
  );
  await page.getByRole("button", { name: "Undo edit", exact: true }).click();
  await page.getByRole("button", { name: "Redo edit", exact: true }).click();
  await page.getByLabel("Maximum colors", { exact: true }).fill("4");
  await expect(pdfButton).toBeEnabled();
  await page
    .getByRole("button", { name: "Use full marker set", exact: true })
    .click();
  await expect(page.getByLabel("Maximum colors", { exact: true })).toHaveValue(
    "60",
  );
  await expect(pdfButton).toBeEnabled();
  const finalPositions = await positions();
  await page.screenshot({
    path: "test-results/adaptive-studio.png",
    fullPage: true,
  });
  for (const [button, file] of [
    ["Download PDF", "adaptive-template.pdf"],
    ["SVG", "adaptive.svg"],
    ["PNG · 300 dpi", "adaptive.png"],
    ["Download color key", "adaptive-key.pdf"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: button, exact: true }).click();
    const d = await pending;
    await d.saveAs(`test-results/${file}`);
    expect((await readFile((await d.path())!)).length).toBeGreaterThan(100);
  }
  const keys = await PDFDocument.load(
    await readFile("test-results/adaptive-key.pdf"),
  );
  expect(keys.getPageCount()).toBe(4);
  await page.getByRole("button", { name: "Colored", exact: true }).click();
  const colored = page.waitForEvent("download");
  await pdfButton.click();
  await (await colored).saveAs("test-results/adaptive-colored.pdf");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByTitle("Export project backup").click();
  const bytes = await readFile((await (await pending).path())!);
  const backup = JSON.parse(bytes.toString());
  expect(backup.settings.dotLayout).toBe("adaptive");
  expect(backup.palette.markers).toHaveLength(60);
  expect(backup.art.palette).toHaveLength(60);
  await page.reload();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  expect(await positions()).toEqual(finalPositions);
  await page.locator("input[type=file]").nth(1).setInputFiles({
    name: "adaptive.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  expect(await positions()).toEqual(finalPositions);
  await step(page, 2);
  await page
    .getByLabel("Letter placement", { exact: true })
    .selectOption("regular");
  await expect(page.locator(".artwork [data-cell]")).toHaveCount(originalCount);
  await step(page, 2);
  await page
    .getByLabel("Letter placement", { exact: true })
    .selectOption("adaptive");
  expect(await positions()).toEqual(finalPositions);
  expect(errors).toEqual([]);
});

test("adaptive placement preserves the real-photo crop and feature settings", async ({
  page,
}) => {
  await page.goto("/");
  await studio(page);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/astronaut.png");
  await expect(page.locator(".detection-status")).toContainText(
    "1 face detected",
    { timeout: 30000 },
  );
  await page
    .getByRole("button", { name: "Accept crop & create artwork", exact: true })
    .click();
  await page
    .getByLabel("Conversion priority", { exact: true })
    .selectOption("Feature Preservation");
  await page.getByLabel("Grid resolution", { exact: true }).selectOption("48");
  await page.getByLabel("Maximum colors", { exact: true }).fill("8");
  await step(page, 2);
  await page
    .getByLabel("Letter placement", { exact: true })
    .selectOption("adaptive");
  const pdf = page.getByRole("button", { name: "Download PDF", exact: true });
  await expect(pdf).toBeEnabled();
  await expect(page.locator(".artwork [data-cell]").first()).toBeVisible();
  await expect(page.getByLabel("Grid resolution", { exact: true })).toHaveValue(
    "48",
  );
  await expect(page.getByLabel("Maximum colors", { exact: true })).toHaveValue(
    "8",
  );
  await page.getByRole("button", { name: "Template", exact: true }).click();
  let pending = page.waitForEvent("download");
  await pdf.click();
  await (await pending).saveAs("test-results/adaptive-portrait-template.pdf");
  await page.getByRole("button", { name: "Colored", exact: true }).click();
  pending = page.waitForEvent("download");
  await pdf.click();
  await (await pending).saveAs("test-results/adaptive-portrait-colored.pdf");
  await page.screenshot({
    path: "test-results/adaptive-portrait.png",
    fullPage: true,
  });
});

test("only untouched legacy demo preferences upgrade to the 60-color starter", async ({
  page,
}) => {
  await page.goto("/");
  await studio(page);
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  const { default: data } = await import("../../src/palettes.json", {
    with: { type: "json" },
  });
  const legacy = {
    name: "Ohuhu Maui 60 — calibration workspace",
    paper: "Uncoated paper, not yet calibrated",
    verified: false,
    markers: data.markers.slice(0, 18),
  };
  const seed = (value: unknown) =>
    page.evaluate(
      (value) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open("paper-pigment", 1);
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("preferences", "readwrite");
            tx.objectStore("preferences").put(value, "palette");
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
          request.onerror = () => reject(request.error);
        }),
      value,
    );
  await seed(legacy);
  await page.reload();
  await page.getByRole("button", { name: "Marker Sets", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Enable / })).toHaveCount(60);
  await seed({
    ...legacy,
    paper: "My measured paper",
    markers: legacy.markers.map((m, i) =>
      i === 0 ? { ...m, hex: "#123456" } : m,
    ),
  });
  await page.reload();
  await page.getByRole("button", { name: "Marker Sets", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Enable / })).toHaveCount(18);
  await expect(
    page.getByLabel("Paper / calibration profile", { exact: true }),
  ).toHaveValue("My measured paper");
  await expect(
    page.getByLabel("Swatch Deep forest", { exact: true }),
  ).toHaveValue("#123456");
});

test("old IndexedDB adaptive pages retain their layout until explicitly upgraded", async ({
  page,
}) => {
  const { defaults } = await import("../../src/types");
  const palette = JSON.parse(await readFile("src/palettes.json", "utf8"));
  await page.goto("/");
  await studio(page);
  const image = await page.locator(".upload-card img").getAttribute("src");
  const settings: Partial<typeof defaults> = {
    ...defaults,
    dotLayout: "adaptive",
    diameter: 3.2,
  };
  delete settings.dotLayoutVersion;
  const legacy = {
    version: 1,
    id: "legacy-adaptive",
    title: "Legacy adaptive page",
    image,
    settings,
    palette,
    edits: { 0: 1 },
    updated: Date.now(),
    art: {
      mode: "dots",
      width: 24,
      height: 28,
      palette: palette.markers,
      assignments: Array(24 * 28).fill(0),
      regions: [],
    },
  };
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("paper-pigment", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").put(value);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    legacy,
  );
  await page.reload();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Upgrade to free placement",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page
      .locator(".artwork [data-cell]")
      .evaluateAll((nodes) =>
        nodes.every((n) => Number(n.getAttribute("data-cell")) < 24 * 28),
      ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Upgrade to free placement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  expect(
    await page
      .locator(".artwork [data-cell]")
      .evaluateAll((nodes) =>
        nodes.some((n) => Number(n.getAttribute("data-cell")) >= 24 * 28),
      ),
  ).toBe(true);
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByTitle("Export project backup").click();
  const saved = JSON.parse(
    (await readFile((await (await pending).path())!)).toString(),
  );
  expect(saved.settings.dotLayoutVersion).toBe(2);
  expect(saved.edits["0"]).toBe(1);
});
