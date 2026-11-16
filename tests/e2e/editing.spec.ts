import { studio, step } from "./helpers";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("photo crop, rotated brush, comparisons and backups preserve source edits", async ({
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
  await page.getByRole("button", { name: "Center / 1×", exact: true }).click();
  await page
    .getByRole("button", { name: "Move crop right", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move crop down", exact: true })
    .click();
  await expect(page.getByLabel("Crop editor zoom")).toHaveValue("1");
  await page
    .getByRole("button", { name: "Accept crop & create artwork", exact: true })
    .click();
  await page
    .getByLabel("Conversion priority")
    .selectOption("Feature Preservation");
  await page.getByLabel("Grid resolution", { exact: true }).selectOption("24");
  await page.getByLabel("Maximum colors", { exact: true }).fill("4");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Importance", exact: true }).click();
  const svg = page.getByRole("img", {
    name: "Importance map; drag to paint priority",
  });
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4, {
    steps: 4,
  });
  await page.mouse.up();
  await expect(
    page.getByRole("button", { name: "Undo brush stroke", exact: true }),
  ).toBeEnabled();
  await step(page, 1);
  await page.getByRole("button", { name: "Rotate 90°", exact: true }).click();
  await step(page, 2);
  await page.getByRole("button", { name: "Strategies", exact: true }).click();
  await expect(page.locator(".comparison-art svg")).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Download comparison proof PDF" }),
  ).toBeEnabled();
  await page.getByLabel("Maximum colors", { exact: true }).fill("8");
  await expect(
    page.getByRole("button", { name: "Download comparison proof PDF" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Grid resolution", { exact: true })).toHaveValue(
    "24",
  );
  await page.getByLabel("Maximum colors", { exact: true }).fill("4");
  await expect(
    page.getByRole("button", { name: "Download comparison proof PDF" }),
  ).toBeEnabled();
  const proofPending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download comparison proof PDF" })
    .click();
  const proof = await proofPending;
  await proof.saveAs("test-results/real-photo-comparison.pdf");
  expect((await readFile((await proof.path())!)).length).toBeGreaterThan(1000);
  await page.screenshot({
    path: "test-results/real-photo-strategies.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Line Art", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download comparison proof PDF" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Dot Art", exact: true }).click();
  await page.getByRole("button", { name: "Colored", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  const backupPending = page.waitForEvent("download");
  await page.getByTitle("Export project backup").click();
  const bytes = await readFile((await (await backupPending).path())!);
  const saved = JSON.parse(bytes.toString());
  expect(saved.originalFile.data.split(",")[1]).toBe(
    (await readFile("tests/fixtures/astronaut.png")).toString("base64"),
  );
  expect(saved.settings.rotation).toBe(90);
  expect(saved.settings.columns).toBe(24);
  expect(saved.settings.colors).toBe(4);
  expect(saved.framing.cx).toBeCloseTo(0.475);
  expect(saved.framing.cy).toBeCloseTo(0.525);
  expect(saved.importanceStrokes).toHaveLength(1);
  expect(saved.importanceStrokes[0].points[0].x).toBeCloseTo(0.3, 1);
  expect(saved.importanceStrokes[0].points[0].y).toBeCloseTo(0.4, 1);
  await page.reload();
  await page.getByRole("button", { name: "My Projects", exact: true }).click();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page.getByRole("button", { name: "Importance", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Undo brush stroke", exact: true }),
  ).toBeEnabled();
  await page.locator("input[type=file]").nth(1).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: bytes,
  });
  await step(page, 1);
  await page
    .getByRole("button", { name: "Crop & reframe", exact: true })
    .click();
  await expect(page.getByLabel("Crop editor zoom")).toHaveValue("1");
  await page
    .getByRole("button", { name: "Keep current crop", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Undo brush stroke", exact: true }),
  ).toBeEnabled();
});

test("crop drag, keyboard, resize and rejection work at 1×", async ({
  page,
}) => {
  await page.goto("/");
  await studio(page);
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await step(page, 1);
  await page
    .getByRole("button", { name: "Crop & reframe", exact: true })
    .click();
  await page.getByRole("button", { name: "Center / 1×", exact: true }).click();
  const svg = page.getByRole("application", { name: /Crop area/ });
  const bounds = (await svg.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.5,
    bounds.y + bounds.height * 0.5,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.55,
    bounds.y + bounds.height * 0.55,
    { steps: 4 },
  );
  await page.mouse.up();
  await svg.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Crop editor zoom")).toHaveValue("1");
  const handle = page.locator("[data-crop-handle]");
  const handleBox = (await handle.boundingBox())!;
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handleBox.x - 20, handleBox.y - 20, { steps: 3 });
  await page.mouse.up();
  expect(
    Number(await page.getByLabel("Crop editor zoom").inputValue()),
  ).toBeGreaterThan(1);
  await page
    .getByRole("button", { name: "Keep current crop", exact: true })
    .click();
  await step(page, 1);
  await page
    .getByRole("button", { name: "Crop & reframe", exact: true })
    .click();
  await expect(page.getByLabel("Crop editor zoom")).toHaveValue("1");
  await page.getByRole("button", { name: "Center / 1×", exact: true }).click();
  await page.getByLabel("Allow white paper margins").uncheck();
  await page
    .getByRole("button", { name: "Move crop right", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply crop", exact: true }).click();
  await step(page, 1);
  await page
    .getByRole("button", { name: "Crop & reframe", exact: true })
    .click();
  await expect(page.getByLabel("Allow white paper margins")).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
