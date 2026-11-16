import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { studio } from "./helpers";

test("portrait option compares, exports and restores feature-aware dots without changing budgets", async ({
  page,
}) => {
  const external: string[] = [];
  page.context().on("request", (r) => {
    const url = new URL(r.url());
    if (url.protocol.startsWith("http") && url.hostname !== "127.0.0.1")
      external.push(r.url());
  });
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
    .getByRole("button", { name: "Preview suggested crop", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Accept crop & create artwork", exact: true })
    .click();
  const priority = page.getByLabel("Conversion priority", { exact: true });
  const resolution = page.getByLabel("Grid resolution", { exact: true });
  const budget = page.getByLabel("Maximum colors", { exact: true });
  await resolution.selectOption("48");
  await budget.fill("12");
  await priority.selectOption("Portrait Simplification");
  await expect(resolution).toHaveValue("48");
  await expect(budget).toHaveValue("12");
  await expect(
    page.getByLabel("Letter placement", { exact: true }),
  ).toHaveValue("adaptive");
  await page.getByRole("button", { name: "Strategies", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Maximum Recognizability", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".comparison-art svg")).toHaveCount(3);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download comparison proof PDF" })
    .click();
  expect(
    (await readFile((await (await download).path())!)).length,
  ).toBeGreaterThan(1000);
  await page.getByRole("button", { name: "Template", exact: true }).click();
  const marks = page.locator(".artwork [data-cell]");
  const markIDs = () =>
    marks.evaluateAll((els) => els.map((e) => e.getAttribute("data-cell")));
  await expect(marks.first()).toBeVisible();
  const save = page.getByRole("button", { name: "Save project", exact: true });
  await save.click();
  const before = await markIDs();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByTitle("Export project backup").click();
  const saved = JSON.parse(
    await readFile((await (await pending).path())!, "utf8"),
  );
  expect(saved.settings.priority).toBe("Portrait Simplification");
  expect(saved.art.dotField.portraitV1.some((v: number) => v > 0.22)).toBe(
    true,
  );
  expect(saved.art.palette.length).toBeLessThanOrEqual(12);
  expect(saved.originalFile.data.split(",")[1]).toBe(
    (await readFile("tests/fixtures/astronaut.png")).toString("base64"),
  );
  await page.reload();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(marks.first()).toBeVisible();
  expect(await markIDs()).toEqual(before);
  expect(external).toEqual([]);
});
