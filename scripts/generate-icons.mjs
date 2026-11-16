// Rasterize the existing vector brand icon; no external assets or inference.
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const source = await readFile("public/icons/app.svg", "utf8");
  for (const [size, name] of [
    [192, "app-192.png"],
    [512, "app-512.png"],
    [180, "apple-touch-icon.png"],
  ]) {
    const data = await page.evaluate(
      async ({ source, size }) => {
        const image = new Image();
        image.src = "data:image/svg+xml;base64," + btoa(source);
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        canvas.getContext("2d").drawImage(image, 0, 0, size, size);
        return canvas.toDataURL("image/png").split(",")[1];
      },
      { source, size },
    );
    await writeFile("public/icons/" + name, Buffer.from(data, "base64"));
  }
} finally {
  await browser.close();
}
