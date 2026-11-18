import { cropPoint } from "./crop";
import type { Settings } from "./types";
import type { Box, FeatureData, SubjectAnalysis } from "./subject-types";

export const subjectSilhouettePriority = "Subject Silhouette";

// Conservative border-connected neutral background estimate, not segmentation.
export function simplifySubject(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  s: Settings,
  analysis: SubjectAnalysis | undefined,
  rect: Box,
  map: FeatureData,
) {
  const out = new Uint8ClampedArray(data);
  if (map.strength === 0)
    return { data: out, foreground: new Float32Array(w * h).fill(1) };
  const background = new Uint8Array(w * h);
  const queue: number[] = [];
  const neutral = (i: number) => {
    const r = data[i * 4],
      g = data[i * 4 + 1],
      b = data[i * 4 + 2];
    return (
      Math.min(r, g, b) >
        170 - Math.min(75, s.backgroundSimplification * 1.37) &&
      Math.max(r, g, b) - Math.min(r, g, b) < 55
    );
  };
  const add = (i: number) => {
    if (
      background[i] ||
      !neutral(i) ||
      map.protected[i] ||
      map.importance[i] > 0.72
    )
      return;
    const x = i % w,
      y = Math.floor(i / w);
    // A wider measured gradient catches antialiased boundaries that one-pixel
    // flood steps can cross. Do not manufacture a subject contour.
    const radius = Math.max(1, Math.round(Math.min(w, h) / 120));
    for (const [dx, dy] of [
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
    ]) {
      const xx = x + dx,
        yy = y + dy;
      if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
      const j = yy * w + xx;
      if (
        [0, 1, 2].some((k) => Math.abs(data[i * 4 + k] - data[j * 4 + k]) > 32)
      )
        return;
    }
    background[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < w; x++) {
    add(x);
    // The bottom often contains cropped clothing, not background.
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q],
      x = i % w,
      y = Math.floor(i / w);
    for (const j of [
      x > 0 ? i - 1 : -1,
      x < w - 1 ? i + 1 : -1,
      y > 0 ? i - w : -1,
      y < h - 1 ? i + w : -1,
    ]) {
      if (j < 0) continue;
      let delta = 0;
      for (let k = 0; k < 3; k++)
        delta = Math.max(delta, Math.abs(data[i * 4 + k] - data[j * 4 + k]));
      if (delta < 16) add(j);
    }
  }
  // Paper removal is explicit and only follows measured, connected pale pixels.
  if (s.white && s.backgroundSimplification > 0)
    for (const i of queue) {
      for (let k = 0; k < 3; k++) out[i * 4 + k] = 255;
      map.importance[i] = 0;
      map.protected[i] = 0;
    }
  // Flatten only observed skin-like pixels inside a detected face. Dark hair,
  // glasses and boundaries remain measured; no oval or anatomy is painted in.
  for (const face of analysis?.faces || []) {
    const corners = [
      cropPoint({ x: face.box.x, y: face.box.y }, rect, s.rotation),
      cropPoint(
        { x: face.box.x + face.box.width, y: face.box.y + face.box.height },
        rect,
        s.rotation,
      ),
    ];
    const left = Math.max(
      0,
      Math.floor(Math.min(...corners.map((p) => p.x)) * w),
    );
    const right = Math.min(
      w,
      Math.ceil(Math.max(...corners.map((p) => p.x)) * w),
    );
    const top = Math.max(
      0,
      Math.floor(Math.min(...corners.map((p) => p.y)) * h),
    );
    const bottom = Math.min(
      h,
      Math.ceil(Math.max(...corners.map((p) => p.y)) * h),
    );
    const cells: number[] = [];
    const channels: number[][] = [[], [], []];
    for (let y = top; y < bottom; y++)
      for (let x = left; x < right; x++) {
        const i = y * w + x,
          r = data[i * 4],
          g = data[i * 4 + 1],
          b = data[i * 4 + 2];
        if (
          background[i] ||
          r < 65 ||
          r < g ||
          g < b * 0.92 ||
          r - b < 8 ||
          r - b > 105
        )
          continue;
        cells.push(i);
        for (let k = 0; k < 3; k++) channels[k].push(data[i * 4 + k]);
      }
    if (cells.length < 8) continue;
    const tone = channels.map(
      (c) => c.sort((a, b) => a - b)[Math.floor(c.length / 2)],
    );
    for (const i of cells) for (let k = 0; k < 3; k++) out[i * 4 + k] = tone[k];
  }
  return { data: out, foreground: Float32Array.from(background, (v) => 1 - v) };
}
