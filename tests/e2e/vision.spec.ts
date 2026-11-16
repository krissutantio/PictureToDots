import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("real photo runs local face inference without outbound requests; missing model falls back", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  context.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== "127.0.0.1"
    )
      external.push(request.url());
  });
  await page.goto("/");
  const source = `data:image/png;base64,${(await readFile("tests/fixtures/astronaut.png")).toString("base64")}`;
  const analyze = () =>
    page.evaluate(async (source) => {
      const path = "/src/analysis.ts";
      const { analyzeSource } = await import(path);
      return analyzeSource(source, new AbortController().signal, () => {});
    }, source);
  const result = await analyze();
  expect(result.modelStatus, result.message).toBe("ready");
  expect(result.method).toBe("face landmarks");
  expect(result.faces).toHaveLength(1);
  expect(result.faces[0].points.length).toBeGreaterThan(400);
  await context.route("**/face_landmarker.task", (route) => route.abort());
  const fallback = await analyze();
  expect(fallback.modelStatus).toBe("fallback");
  expect(fallback.faces).toEqual([]);
  expect(fallback.saliency.length).toBe(fallback.width * fallback.height);
  expect(external).toEqual([]);
});

test("animal, outdoor photo, blank input and cancellation use honest local results", async ({
  page,
  context,
}) => {
  const external: string[] = [],
    assets: string[] = [];
  context.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== "127.0.0.1"
    )
      external.push(request.url());
    if (request.url().endsWith(".tflite")) assets.push(request.url());
  });
  await page.goto("/");
  for (const file of ["chelsea.png", "rocket.jpg"]) {
    const src = `data:image/${file.endsWith("jpg") ? "jpeg" : "png"};base64,${(await readFile(`tests/fixtures/${file}`)).toString("base64")}`;
    const result = await page.evaluate(async (src) => {
      const path = "/src/analysis.ts";
      const { analyzeSource } = await import(path);
      return analyzeSource(src, new AbortController().signal, () => {});
    }, src);
    console.log(file, result.kind, result.method, result.message);
    expect(result.modelStatus, result.message).toBe("ready");
    expect(result.faces).toEqual([]);
    if (file === "chelsea.png") expect(result.kind).toBe("Animal");
  }
  const blank = await page.evaluate(async () => {
    const path = "/src/analysis.ts";
    const { analyzeSource } = await import(path);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 100;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "white";
    c.fillRect(0, 0, 100, 100);
    const source = canvas.toDataURL();
    const result = await analyzeSource(
      source,
      new AbortController().signal,
      () => {},
    );
    const controller = new AbortController();
    const pending = analyzeSource(source, controller.signal, () => {});
    controller.abort();
    let aborted = false;
    try {
      await pending;
    } catch (error) {
      aborted = (error as Error).name === "AbortError";
    }
    return { result, aborted };
  });
  expect(blank.result.faces).toEqual([]);
  expect(blank.aborted).toBe(true);
  expect(assets.some((url) => url.endsWith("efficientdet_lite0.tflite"))).toBe(
    true,
  );
  expect(assets.some((url) => url.endsWith("efficientnet_lite0.tflite"))).toBe(
    true,
  );
  expect(external).toEqual([]);
});

test("two-photo composite detects multiple faces; worker blocks external fetch forms", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  context.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== "127.0.0.1"
    )
      external.push(request.url());
  });
  await page.goto("/");
  const source = `data:image/png;base64,${(await readFile("tests/fixtures/astronaut.png")).toString("base64")}`;
  const faces = await page.evaluate(async (source) => {
    const path = "/src/analysis.ts";
    const { analyzeSource } = await import(path);
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 288;
    const c = canvas.getContext("2d")!;
    c.drawImage(image, 125, 0, 230, 260, 0, 0, 256, 288);
    c.drawImage(image, 125, 0, 230, 260, 256, 0, 256, 288);
    return (
      await analyzeSource(
        canvas.toDataURL(),
        new AbortController().signal,
        () => {},
      )
    ).faces;
  }, source);
  expect(faces).toHaveLength(2);
  const blocked = await page.evaluate(
    () =>
      new Promise<number[]>((resolve, reject) => {
        const script = `self.ASSET_BASE=${JSON.stringify(new URL("/vision/", location.href).href)};importScripts(new URL('model-worker.js',self.ASSET_BASE).href);Promise.all(['https://example.invalid/telemetry',new URL('https://example.invalid/telemetry'),new Request('https://example.invalid/telemetry')].map(resource=>fetch(resource).then(response=>response.status))).then(status=>postMessage(status));`;
        const url = URL.createObjectURL(
          new Blob([script], { type: "application/javascript" }),
        );
        const worker = new Worker(url);
        worker.onmessage = (e) => {
          worker.terminate();
          URL.revokeObjectURL(url);
          resolve(e.data);
        };
        worker.onerror = (e) => {
          worker.terminate();
          URL.revokeObjectURL(url);
          reject(Error(e.message));
        };
      }),
  );
  expect(blocked).toEqual([204, 204, 204]);
  expect(external).toEqual([]);
});
