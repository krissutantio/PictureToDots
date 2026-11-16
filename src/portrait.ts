import { clamp, cropPoint } from "./crop";
import type { Box, FeatureData, Face, Point } from "./subject-types";
import type { Settings } from "./types";

export const portraitPriority = "Portrait Simplification" as const;

const luminance = (pixels: ArrayLike<number>, i: number) =>
  pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;

function center(points: Point[]) {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}

export function portraitEyeSpacing(
  face: Face,
  rect: Box,
  rotation: number,
  width: number,
  height: number,
) {
  const [a, b] = face.groups.eyes.map((eye) =>
    cropPoint(center(eye), rect, rotation),
  );
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

/**
 * Use landmarks as search windows. Only measured local dark contrast can reserve
 * a mark; no landmark path, glasses outline, or hidden anatomy is drawn.
 */
export function simplifyPortrait(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tw: number,
  s: Settings,
  faces: Face[],
  rect: Box,
  map: FeatureData,
) {
  const strength = map.strength;
  const evidence = new Float32Array(w * h),
    luma = Float32Array.from(evidence, (_, i) => luminance(data, i * 4)),
    integral = new Float64Array((w + 1) * (h + 1)),
    stride = w + 1;
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += luma[y * w + x];
      integral[(y + 1) * stride + x + 1] = row + integral[y * stride + x + 1];
    }
  }
  const mean = (x: number, y: number, radius: number) => {
    const l = Math.max(0, x - radius),
      r = Math.min(w, x + radius + 1),
      t = Math.max(0, y - radius),
      b = Math.min(h, y + radius + 1);
    return (
      (integral[b * stride + r] -
        integral[t * stride + r] -
        integral[b * stride + l] +
        integral[t * stride + l]) /
      ((r - l) * (b - t))
    );
  };
  for (const face of faces) {
    const eyeSpacing = portraitEyeSpacing(face, rect, s.rotation, w, h);
    if (!Number.isFinite(eyeSpacing) || eyeSpacing < 4) continue;
    const radius = clamp(Math.round(eyeSpacing * 0.18), 3, 24);
    const eyeWindow = Math.max(2, eyeSpacing * 0.47);
    const eyes = face.groups.eyes.map((group) =>
      cropPoint(center(group), rect, s.rotation),
    );
    for (const point of eyes) {
      const px = point.x * w,
        py = point.y * h;
      for (
        let y = Math.max(0, Math.floor(py - eyeWindow));
        y < Math.min(h, py + eyeWindow);
        y++
      )
        for (
          let x = Math.max(0, Math.floor(px - eyeWindow));
          x < Math.min(w, px + eyeWindow);
          x++
        ) {
          const r = Math.hypot(x + 0.5 - px, y + 0.5 - py) / eyeWindow;
          const i = y * w + x;
          if (r > 1 || map.importance[i] < 0.17) continue;
          const contrast = clamp((mean(x, y, radius) - luma[i] - 14) / 42);
          evidence[i] = Math.max(evidence[i], contrast * clamp((1 - r) * 3));
        }
    }
  }
  for (let i = 0; i < evidence.length; i++) {
    if (map.protected[i]) {
      const radius = Math.max(2, Math.round((w / tw) * 1.7));
      const darkness = mean(i % w, Math.floor(i / w), radius) - luma[i];
      evidence[i] = Math.max(evidence[i], clamp((darkness - 11) / 35));
    }
    evidence[i] *= strength;
    if (evidence[i] > 0.22) {
      map.protected[i] = 1;
      map.importance[i] = Math.max(
        map.importance[i],
        0.65 + evidence[i] * 0.35,
      );
    }
  }

  // Two scales of range-weighted averaging unify nearby tones while retaining
  // dark feature centers and strong silhouette/foreground transitions.
  let current = new Uint8ClampedArray(data);
  const scale = Math.max(1, Math.round(w / tw));
  for (const step of [scale, Math.max(1, Math.round(scale * 2.2))]) {
    const next = new Uint8ClampedArray(current);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          base = i * 4;
        if (data[base] > 244 && data[base + 1] > 244 && data[base + 2] > 244)
          continue;
        let r = current[base],
          g = current[base + 1],
          b = current[base + 2],
          weight = 1;
        const width =
          25 + s.backgroundSimplification * (1 - map.importance[i]) * 0.45;
        for (const dy of [-step, 0, step])
          for (const dx of [-step, 0, step]) {
            if (
              (!dx && !dy) ||
              x + dx < 0 ||
              y + dy < 0 ||
              x + dx >= w ||
              y + dy >= h
            )
              continue;
            const j = ((y + dy) * w + x + dx) * 4;
            const difference =
              (current[j] - current[base]) ** 2 +
              (current[j + 1] - current[base + 1]) ** 2 +
              (current[j + 2] - current[base + 2]) ** 2;
            const t = Math.exp(-difference / (3 * width * width));
            weight += t;
            r += current[j] * t;
            g += current[j + 1] * t;
            b += current[j + 2] * t;
          }
        const mix =
          strength *
          (s.textureRemoval / 100) *
          (1 - clamp(evidence[i] * 1.8)) *
          (map.protected[i] ? 0.55 : 1);
        next[base] += (r / weight - next[base]) * mix;
        next[base + 1] += (g / weight - next[base + 1]) * mix;
        next[base + 2] += (b / weight - next[base + 2]) * mix;
      }
    current = next;
  }
  return { data: current, evidence };
}
