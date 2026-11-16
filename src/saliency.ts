import type { SubjectAnalysis, Box } from "./subject-types";
import { clamp } from "./crop";
export function analyzeSaliency(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): SubjectAnalysis {
  const gray = new Float32Array(w * h),
    border = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < w * h; i++) {
    gray[i] =
      data[i * 4] * 0.2126 +
      data[i * 4 + 1] * 0.7152 +
      data[i * 4 + 2] * 0.0722;
    const x = i % w,
      y = Math.floor(i / w);
    if (x < 3 || y < 3 || x > w - 4 || y > h - 4) {
      for (let k = 0; k < 3; k++) border[k] += data[i * 4 + k];
      count++;
    }
  }
  border.forEach((_, k) => (border[k] /= count));
  const edges: number[] = [],
    saliency: number[] = [];
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const x = i % w,
      y = Math.floor(i / w),
      dx =
        gray[y * w + Math.min(w - 1, x + 1)] - gray[y * w + Math.max(0, x - 1)],
      dy =
        gray[Math.min(h - 1, y + 1) * w + x] - gray[Math.max(0, y - 1) * w + x];
    const edge = clamp(Math.hypot(dx, dy) / 100);
    edges.push(edge);
    const color =
        Math.sqrt(
          border.reduce((v, c, k) => v + (c - data[i * 4 + k]) ** 2, 0),
        ) / 240,
      center = 1 - Math.hypot(x / w - 0.5, y / h - 0.5);
    const v = clamp(color * 0.6 + edge * 0.3 + Math.max(0, center) * 0.1);
    saliency.push(v);
    sum += v;
  }
  const smooth = saliency.map((_, i) => {
    let sum = 0,
      n = 0;
    const x = i % w,
      y = Math.floor(i / w);
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx,
          yy = y + dy;
        if (xx >= 0 && xx < w && yy >= 0 && yy < h) {
          sum += saliency[yy * w + xx];
          n++;
        }
      }
    return sum / n;
  });
  const threshold = Math.max(0.18, (sum / (w * h)) * 1.2),
    seen = new Uint8Array(w * h);
  let best: number[] = [],
    bestScore = 0;
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || smooth[i] < threshold) continue;
    const cells = [i];
    seen[i] = 1;
    let score = 0;
    for (let q = 0; q < cells.length; q++) {
      const j = cells[q],
        x = j % w;
      score += smooth[j];
      for (const k of [
        j - w,
        j + w,
        ...(x ? [j - 1] : []),
        ...(x < w - 1 ? [j + 1] : []),
      ])
        if (k >= 0 && k < w * h && !seen[k] && smooth[k] >= threshold) {
          seen[k] = 1;
          cells.push(k);
        }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cells;
    }
  }
  let box: Box = { x: 0, y: 0, width: 1, height: 1 };
  if (best.length > 4) {
    const xs = best.map((i) => i % w),
      ys = best.map((i) => Math.floor(i / w));
    const x = Math.min(...xs) / w,
      y = Math.min(...ys) / h;
    box = {
      x,
      y,
      width: (Math.max(...xs) + 1) / w - x,
      height: (Math.max(...ys) + 1) / h - y,
    };
  }
  return {
    width: w,
    height: h,
    saliency: smooth,
    edges,
    box,
    faces: [],
    kind: "General object",
    method: "generic saliency",
    confidence: clamp((bestScore / (w * h)) * 3),
    message:
      "Structure-based estimate; no reliable semantic subject detection yet.",
    modelStatus: "fallback",
  };
}
