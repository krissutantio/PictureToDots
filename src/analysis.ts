import { loadImage } from "./samples";
import type { SubjectAnalysis, Face, Box } from "./subject-types";
const union = (boxes: Box[]): Box => {
  const x = Math.min(...boxes.map((b) => b.x)),
    y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
};
export async function analyzeSource(
  src: string,
  signal: AbortSignal,
  progress: (message: string) => void,
): Promise<SubjectAnalysis> {
  const image = await loadImage(src);
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  const scale = Math.min(1, 192 / Math.max(image.width, image.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const c = canvas.getContext("2d")!;
  c.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = c.getImageData(0, 0, canvas.width, canvas.height);
  progress("Finding important shapes…");
  const generic = await new Promise<SubjectAnalysis>((resolve, reject) => {
    const worker = new Worker(
      new URL("./analysis.worker.ts", import.meta.url),
      { type: "module" },
    );
    const abort = () => {
      worker.terminate();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.onmessage = (e) => {
      worker.terminate();
      signal.removeEventListener("abort", abort);
      e.data.error ? reject(Error(e.data.error)) : resolve(e.data);
    };
    worker.onerror = (e) => {
      worker.terminate();
      signal.removeEventListener("abort", abort);
      reject(Error(e.message));
    };
    worker.postMessage(
      { data: pixels.data, width: canvas.width, height: canvas.height },
      [pixels.data.buffer],
    );
  });
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  const base = new URL(`${import.meta.env.BASE_URL}vision/`, location.href)
    .href;
  const script = `self.ASSET_BASE=${JSON.stringify(base)};importScripts(${JSON.stringify(new URL("model-worker.js", base).href)});`;
  const workerURL = URL.createObjectURL(
    new Blob([script], { type: "application/javascript" }),
  );
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(workerURL);
    } catch {
      URL.revokeObjectURL(workerURL);
      resolve({
        ...generic,
        message:
          "Local vision worker could not start. Generic saliency is active.",
      });
      return;
    }
    const finish = (result?: SubjectAnalysis, error?: Error) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(workerURL);
      signal.removeEventListener("abort", abort);
      error ? reject(error) : resolve(result!);
    };
    const abort = () =>
      finish(undefined, new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(
      () =>
        finish({
          ...generic,
          message:
            "Local model loading timed out. Using generic saliency; you can retry detection.",
        }),
      45000,
    );
    worker.onmessage = (e) => {
      const v = e.data;
      if (v.progress) {
        progress(v.progress);
        return;
      }
      if (v.fallback) {
        finish({ ...generic, message: v.fallback });
        return;
      }
      const faces = v.faces as Face[];
      finish({
        ...generic,
        faces,
        kind: v.kind,
        method: v.method,
        confidence: v.confidence,
        box: faces.length
          ? union(faces.map((f) => f.box))
          : v.box || generic.box,
        modelStatus: "ready",
        message: faces.length
          ? `${faces.length} face${faces.length > 1 ? "s" : ""} detected. Landmarks are estimates; inspect occlusions and small features.`
          : `${v.label || v.kind} is the model’s suggested category. The crop boundary ${v.box ? "uses an object box" : "is a saliency estimate"}.`,
      });
    };
    worker.onerror = () =>
      finish({
        ...generic,
        message:
          "Local vision worker could not load. Generic saliency is active.",
      });
    (async () => {
      const max = 1024,
        scale = Math.min(1, max / Math.max(image.width, image.height));
      const bitmap = await createImageBitmap(image, {
        resizeWidth: Math.round(image.width * scale),
        resizeHeight: Math.round(image.height * scale),
      });
      if (signal.aborted) {
        bitmap.close();
        return;
      }
      worker.postMessage({ bitmap }, [bitmap]);
    })().catch(() => finish(generic));
  });
}
