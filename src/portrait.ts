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

/** Landmarks bound the search for visible contrast in the sampled photo. */
export function simplifyPortrait(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tw: number,
  th: number,
  s: Settings,
  faces: Face[],
  rect: Box,
  map: FeatureData,
) {
  const strength = map.strength;
  const evidence = new Float32Array(w * h),
    toneArea = new Uint8Array(tw * th),
    luma = Float32Array.from(evidence, (_, i) => luminance(data, i * 4)),
    warmth = Float32Array.from(
      evidence,
      (_, i) => data[i * 4] - data[i * 4 + 1],
    );
  const meanLuma = localMean(luma, w, h);
  const meanWarmth = localMean(warmth, w, h);
  const fineRadius = Math.max(1, Math.round((w / tw) * 0.68));
  const coarseRadius = fineRadius * 2;
  const control = { Low: 0.62, Medium: 0.81, High: 1 }[s.facialDetail];
  const contrastBoost = new Float32Array(w * h);
  const deposit = (i: number, score: number, delta: number) => {
    if (score <= evidence[i] || map.importance[i] < 0.17 || map.suppressed?.[i])
      return;
    evidence[i] = score;
    contrastBoost[i] = delta;
  };

  // Dark creases and lighter gaps are measured independently. Opposite-side
  // luma comparisons favor the center of a thin stroke over its outside edge.
  const directions = [
    [fineRadius, 0],
    [0, fineRadius],
    [fineRadius, fineRadius],
    [fineRadius, -fineRadius],
  ];
  const ridge = (x: number, y: number, value: number) => {
    let contrast = 0;
    for (const [dx, dy] of directions) {
      if (
        x - Math.abs(dx) < 0 ||
        y - Math.abs(dy) < 0 ||
        x + Math.abs(dx) >= w ||
        y + Math.abs(dy) >= h
      )
        continue;
      contrast = Math.max(
        contrast,
        Math.min(luma[(y - dy) * w + x - dx], luma[(y + dy) * w + x + dx]) -
          value,
      );
    }
    return contrast;
  };
  const search = (
    points: Point[],
    margin: number,
    kind: "eye line" | "eye" | "brow" | "nose" | "mouth",
  ) => {
    if (!points.length) return;
    const left = Math.min(...points.map((p) => p.x * w)),
      right = Math.max(...points.map((p) => p.x * w)),
      top = Math.min(...points.map((p) => p.y * h)),
      bottom = Math.max(...points.map((p) => p.y * h));
    for (
      let y = Math.max(0, Math.floor(top - margin));
      y < Math.min(h, bottom + margin);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(left - margin));
        x < Math.min(w, right + margin);
        x++
      ) {
        const distance = Math.hypot(
          Math.max(left - x, 0, x - right),
          Math.max(top - y, 0, y - bottom),
        );
        const proximity =
          kind === "eye line"
            ? clamp(1 - (distance / margin) ** 2)
            : clamp((1 - distance / margin) * 2);
        if (!proximity) continue;
        const i = y * w + x;
        const fine = meanLuma(x, y, fineRadius) - luma[i];
        const coarse = meanLuma(x, y, coarseRadius) - luma[i];
        const stroke = ridge(x, y, luma[i]);
        const dark =
          kind === "eye line"
            ? Math.max(stroke, Math.min(fine, coarse) * 0.72)
            : Math.max(fine, coarse * 0.72, stroke * 0.78);
        const threshold = kind === "eye line" ? 10 : 4;
        deposit(i, clamp((dark - threshold) / 24) * proximity * control, -dark);
        if (kind === "eye") {
          const light = Math.max(-fine, -coarse * 0.75);
          deposit(
            i,
            clamp((light - 9) / 24) * 0.93 * proximity * control,
            light,
          );
        }
        if (kind === "mouth") {
          const red = warmth[i] - meanWarmth(x, y, coarseRadius);
          deposit(
            i,
            clamp((red - 4) / 14) * 0.8 * proximity * control,
            Math.min(0, -fine),
          );
        }
      }
  };
  for (const face of faces) {
    const eyeSpacing = portraitEyeSpacing(face, rect, s.rotation, w, h);
    if (!Number.isFinite(eyeSpacing) || eyeSpacing < 4) continue;
    const crop = (group: Point[]) =>
      group.map((point) => cropPoint(point, rect, s.rotation));
    const eyes = face.groups.eyes.map(crop);
    search(eyes.flat(), Math.max(2, eyeSpacing * 0.49), "eye line");
    for (const eye of eyes) search(eye, Math.max(2, eyeSpacing * 0.1), "eye");
    for (const brow of face.groups.brows)
      search(crop(brow), Math.max(2, eyeSpacing * 0.08), "brow");
    search(crop(face.groups.nose), Math.max(2, eyeSpacing * 0.14), "nose");
    search(crop(face.groups.mouth), Math.max(2, eyeSpacing * 0.1), "mouth");

    const box = face.box;
    const [a, b] = crop([
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
    ]);
    const cx = (a.x + b.x) / 2,
      cy = (a.y + b.y) / 2;
    const rx = Math.abs(a.x - b.x) / 2,
      ry = Math.abs(a.y - b.y) / 2;
    if (rx <= 0 || ry <= 0) continue;
    for (let y = 0; y < th; y++)
      for (let x = 0; x < tw; x++) {
        const u = (x + 0.5) / tw,
          v = (y + 0.5) / th;
        if (
          ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1 &&
          !map.suppressed?.[Math.floor(v * h) * w + Math.floor(u * w)]
        )
          toneArea[y * tw + x] = 1;
      }
  }
  for (let i = 0; i < evidence.length; i++) {
    if (map.protected[i]) {
      const contrast =
        meanLuma(i % w, Math.floor(i / w), coarseRadius) - luma[i];
      deposit(i, clamp((contrast - 11) / 35) * 0.6, -contrast);
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
  // Reinforce the sign of modest observed contrasts before ink matching.
  for (let i = 0; i < evidence.length; i++) {
    const delta = contrastBoost[i];
    if (evidence[i] <= 0.22 || Math.abs(delta) > 52) continue;
    const offset =
      clamp(delta, -38, 32) * evidence[i] * (s.localContrast / 100);
    for (let k = 0; k < 3; k++) current[i * 4 + k] += offset;
  }
  return { data: current, evidence, toneArea };
}

function localMean(field: Float32Array, w: number, h: number) {
  const stride = w + 1;
  const summed = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += field[y * w + x];
      summed[(y + 1) * stride + x + 1] = row + summed[y * stride + x + 1];
    }
  }
  return (x: number, y: number, radius: number) => {
    const left = Math.max(0, x - radius),
      right = Math.min(w, x + radius + 1),
      top = Math.max(0, y - radius),
      bottom = Math.min(h, y + radius + 1);
    return (
      (summed[bottom * stride + right] -
        summed[top * stride + right] -
        summed[bottom * stride + left] +
        summed[top * stride + left]) /
      ((right - left) * (bottom - top))
    );
  };
}
