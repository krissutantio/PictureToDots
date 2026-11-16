import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
let server: Server;
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url!, "http://localhost").pathname;
      if (!pathname.startsWith("/PictureToDots/")) {
        res.writeHead(404).end();
        return;
      }
      const file = resolve(
        "dist",
        pathname.slice("/PictureToDots/".length) || "index.html",
      );
      if (!file.startsWith(resolve("dist") + "/")) throw Error();
      const bytes = await readFile(file);
      res.setHeader(
        "Content-Type",
        (
          {
            ".js": "application/javascript",
            ".html": "text/html",
            ".css": "text/css",
            ".wasm": "application/wasm",
          } as Record<string, string>
        )[extname(file)] || "application/octet-stream",
      );
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(5178, "127.0.0.1", r));
});
test.afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});
test("production works under a repository path and reloads offline", async ({
  page,
  context,
}) => {
  await page.goto("http://127.0.0.1:5178/PictureToDots/");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  // Load models under the production CSP and repository subpath, then repeat offline.
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
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(
      keys.find((key) => key.startsWith("paper-pigment-"))!,
    );
    for (let attempt = 0; attempt < 100; attempt++) {
      if (
        (await cache.keys()).some((request) =>
          request.url.endsWith("face_landmarker.task"),
        )
      )
        return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw Error("Face model was not cached");
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Line Art", exact: true }).click();
  await expect(page.locator("[data-region]").first()).toBeVisible();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/astronaut.png");
  await expect(page.locator(".detection-status")).toContainText(
    "1 face detected",
    { timeout: 30000 },
  );
  await page
    .getByRole("button", { name: "Keep current crop", exact: true })
    .click();
  await context.setOffline(false);
});
