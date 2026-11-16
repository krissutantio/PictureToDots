import { portraitPriority, simplifyPortrait } from "./portrait";
import { clamp, cropPoint, unrotatePoint } from "./crop";
import type { Settings, Artwork } from "./types";
import type {
  SubjectAnalysis,
  ImportanceStroke,
  Box,
  Point,
  FeatureData,
  FeatureMetrics,
} from "./subject-types";
export const priorities = [
  "Color Accuracy",
  "Balanced",
  "Feature Preservation",
  "Maximum Recognizability",
  portraitPriority,
] as const;
export const comparisonPriorities = (s: Settings) =>
  s.mode === "dots" && s.priority === portraitPriority
    ? (["Color Accuracy", "Maximum Recognizability", portraitPriority] as const)
    : priorities.slice(0, 3);
export function priorityStrength(s: Settings) {
  return (
    (({
      "Color Accuracy": 0,
      Balanced: 0.45,
      "Feature Preservation": 0.8,
      "Maximum Recognizability": 1,
      [portraitPriority]: 1,
    }[s.priority] ?? 0) *
      s.featureStrength) /
    100
  );
}
export const portraitPreset: Partial<Settings> = {
  priority: "Feature Preservation",
  featureStrength: 90,
  backgroundSimplification: 75,
  edgeEmphasis: 65,
  localContrast: 65,
  textureRemoval: 80,
  facialDetail: "High",
  minFeatureSize: 1.2,
  preserveHair: true,
  subjectKind: "Portrait",
};
const sample = (map: number[], w: number, h: number, p: Point) =>
  p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1
    ? 0
    : map[
        Math.min(h - 1, Math.floor(p.y * h)) * w +
          Math.min(w - 1, Math.floor(p.x * w))
      ] || 0;
function stamp(
  field: Float32Array,
  protectedMap: Uint8Array,
  w: number,
  h: number,
  points: Point[],
  radius: number,
  value: number,
  protect = false,
) {
  for (let k = 0; k < Math.max(1, points.length - 1); k++) {
    const a = points[k],
      b = points[Math.min(k + 1, points.length - 1)];
    const ax = a.x * w,
      ay = a.y * h,
      bx = b.x * w,
      by = b.y * h,
      dx = bx - ax,
      dy = by - ay,
      den = dx * dx + dy * dy;
    const left = Math.max(0, Math.floor(Math.min(ax, bx) - radius)),
      right = Math.min(w - 1, Math.ceil(Math.max(ax, bx) + radius)),
      top = Math.max(0, Math.floor(Math.min(ay, by) - radius)),
      bottom = Math.min(h - 1, Math.ceil(Math.max(ay, by) + radius));
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const t = den
            ? clamp(((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / den)
            : 0,
          d = Math.hypot(x + 0.5 - ax - t * dx, y + 0.5 - ay - t * dy);
        if (d > radius) continue;
        const i = y * w + x;
        if (value < 0) {
          field[i] *= clamp(d / radius) * 0.3;
          protectedMap[i] = 0;
        } else {
          field[i] = Math.max(
            field[i],
            value * (0.65 + 0.35 * (1 - d / radius)),
          );
          if (protect) protectedMap[i] = 1;
        }
      }
  }
}
export function importanceMap(
  w: number,
  h: number,
  targetW: number,
  s: Settings,
  analysis: SubjectAnalysis | undefined,
  strokes: ImportanceStroke[],
  rect: Box,
  rotation: number,
  edges?: Float32Array,
): FeatureData {
  const importance = new Float32Array(w * h),
    protectedMap = new Uint8Array(w * h),
    edgeMap = edges || new Float32Array(w * h);
  const strength = priorityStrength(s);
  for (let i = 0; i < w * h; i++) {
    const p = unrotatePoint(
      {
        x: rect.x + (((i % w) + 0.5) / w) * rect.width,
        y: rect.y + ((Math.floor(i / w) + 0.5) / h) * rect.height,
      },
      rotation,
    );
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) continue;
    const box = analysis?.box,
      inside =
        box &&
        p.x >= box.x &&
        p.x <= box.x + box.width &&
        p.y >= box.y &&
        p.y <= box.y + box.height;
    const salient = analysis
      ? sample(analysis.saliency, analysis.width, analysis.height, p)
      : 0.3;
    importance[i] = clamp(0.12 + salient * 0.65 + (inside ? 0.2 : 0));
    if (!edges && analysis)
      edgeMap[i] = sample(analysis.edges, analysis.width, analysis.height, p);
  }
  const detail = { Low: 0.55, Medium: 0.8, High: 1 }[s.facialDetail] || 1,
    radius = (Math.max(0.7, s.minFeatureSize * 0.45) * w) / targetW;
  for (const face of analysis?.faces || []) {
    const map = (p: Point) => cropPoint(p, rect, rotation);
    for (const eye of face.groups.eyes)
      stamp(importance, protectedMap, w, h, eye.map(map), radius, 0.98, true);
    for (const brow of face.groups.brows)
      stamp(
        importance,
        protectedMap,
        w,
        h,
        brow.map(map),
        radius * 0.8,
        0.92 * detail,
        true,
      );
    stamp(
      importance,
      protectedMap,
      w,
      h,
      face.groups.nose.map(map),
      radius * 0.7,
      0.78 * detail,
      true,
    );
    stamp(
      importance,
      protectedMap,
      w,
      h,
      face.groups.mouth.map(map),
      radius,
      0.98,
      true,
    );
    stamp(
      importance,
      protectedMap,
      w,
      h,
      face.groups.oval.map(map),
      radius * 0.7,
      0.8 * detail,
      true,
    );
    // Hair is not a face landmark. Preserve only observed edges in a broad silhouette band.
    if (s.preserveHair)
      for (let i = 0; i < w * h; i++) {
        const p = unrotatePoint(
            {
              x: rect.x + (((i % w) + 0.5) / w) * rect.width,
              y: rect.y + ((Math.floor(i / w) + 0.5) / h) * rect.height,
            },
            rotation,
          ),
          b = face.box;
        const band =
          p.x > b.x - b.width * 0.25 &&
          p.x < b.x + b.width * 1.25 &&
          p.y > b.y - b.height * 0.4 &&
          p.y < b.y + b.height * 0.7;
        const interior =
          p.x > b.x + b.width * 0.15 &&
          p.x < b.x + b.width * 0.85 &&
          p.y > b.y + b.height * 0.15;
        if (band && !interior && edgeMap[i] > 0.16) {
          importance[i] = Math.max(importance[i], 0.72 + edgeMap[i] * 0.2);
          if (edgeMap[i] > 0.4) protectedMap[i] = 1;
        }
      }
  }
  for (const stroke of strokes)
    stamp(
      importance,
      protectedMap,
      w,
      h,
      stroke.points.map((p) => cropPoint(p, rect, rotation)),
      stroke.radius * Math.min(w / rect.width, h / rect.height),
      stroke.value,
      stroke.value > 0,
    );
  return { importance, edges: edgeMap, protected: protectedMap, strength };
}
export function edgeField(data: Uint8ClampedArray, w: number, h: number) {
  const luma = new Float32Array(w * h),
    edges = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    luma[i] =
      data[i * 4] * 0.2126 +
      data[i * 4 + 1] * 0.7152 +
      data[i * 4 + 2] * 0.0722;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      edges[i] = clamp(
        Math.hypot(luma[i + 1] - luma[i - 1], luma[i + w] - luma[i - w]) / 90,
      );
    }
  return { luma, edges };
}
export function resizeAverage(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tw: number,
  th: number,
) {
  const out = new Uint8ClampedArray(tw * th * 4);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      let n = 0,
        sum = [0, 0, 0];
      for (
        let yy = Math.floor((y * h) / th);
        yy <
        Math.max(Math.floor((y * h) / th) + 1, Math.floor(((y + 1) * h) / th));
        yy++
      )
        for (
          let xx = Math.floor((x * w) / tw);
          xx <
          Math.max(
            Math.floor((x * w) / tw) + 1,
            Math.floor(((x + 1) * w) / tw),
          );
          xx++
        ) {
          const i = (yy * w + xx) * 4;
          for (let k = 0; k < 3; k++) sum[k] += data[i + k];
          n++;
        }
      const i = (y * tw + x) * 4;
      sum.forEach((v, k) => (out[i + k] = v / n));
      out[i + 3] = 255;
    }
  return out;
}
function prepareTones(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  s: Settings,
  map: FeatureData,
  edges: Float32Array,
) {
  const strength = map.strength;
  let current = new Float32Array(data),
    next = new Float32Array(data.length);
  const passes = Math.max(1, Math.round(s.textureRemoval / 25));
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x,
          base = i * 4,
          imp = map.importance[i],
          sum = [current[base], current[base + 1], current[base + 2]];
        let total = 1;
        const radius = imp < 0.4 ? 2 : 1;
        for (let dy = -radius; dy <= radius; dy++)
          for (let dx = -radius; dx <= radius; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx,
              yy = y + dy;
            if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
            const j = (yy * w + xx) * 4,
              d =
                (current[j] - current[base]) ** 2 +
                (current[j + 1] - current[base + 1]) ** 2 +
                (current[j + 2] - current[base + 2]) ** 2;
            const weight = Math.exp(-d / (map.protected[i] ? 900 : 6000));
            total += weight;
            for (let k = 0; k < 3; k++) sum[k] += current[j + k] * weight;
          }
        const mix =
          ((strength * s.textureRemoval) / 100) *
          (map.protected[i] ? 0.2 : 0.85);
        for (let k = 0; k < 3; k++)
          next[base + k] =
            current[base + k] * (1 - mix) + (sum[k] / total) * mix;
        next[base + 3] = 255;
      }
    const temp = current;
    current = next;
    next = temp;
  }
  const adjusted = new Uint8ClampedArray(current.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        base = i * 4,
        imp = map.importance[i];
      let mean = 0,
        n = 0;
      for (let dy = -3; dy <= 3; dy += 3)
        for (let dx = -3; dx <= 3; dx += 3) {
          const xx = clamp(x + dx, 0, w - 1),
            yy = clamp(y + dy, 0, h - 1),
            j = (yy * w + xx) * 4;
          mean +=
            current[j] * 0.2126 +
            current[j + 1] * 0.7152 +
            current[j + 2] * 0.0722;
          n++;
        }
      mean /= n;
      const l =
        current[base] * 0.2126 +
        current[base + 1] * 0.7152 +
        current[base + 2] * 0.0722;
      const detail =
        (l - mean) *
        strength *
        (s.localContrast / 100 + (edges[i] * s.edgeEmphasis) / 100) *
        imp;
      const background =
        ((1 - imp) * strength * s.backgroundSimplification) / 100;
      for (let k = 0; k < 3; k++)
        adjusted[base + k] = clamp(
          (current[base + k] + detail) * (1 - background * 0.35) +
            mean * background * 0.35,
          0,
          255,
        );
      adjusted[base + 3] = 255;
    }
  return adjusted;
}
export function featurePrepare(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tw: number,
  th: number,
  s: Settings,
  analysis: SubjectAnalysis | undefined,
  strokes: ImportanceStroke[],
  rect: Box,
): {
  data: Uint8ClampedArray;
  features: FeatureData;
  detailData: Uint8ClampedArray;
  detailImportance: Float32Array;
  portraitEvidence?: Float32Array;
} {
  const { edges } = edgeField(data, w, h),
    map = importanceMap(
      w,
      h,
      tw,
      s,
      analysis,
      strokes,
      rect,
      s.rotation,
      edges,
    ),
    strength = map.strength;
  const portrait =
    s.priority === portraitPriority &&
    s.mode === "dots" &&
    analysis?.faces.length &&
    strength > 0
      ? simplifyPortrait(data, w, h, tw, s, analysis.faces, rect, map)
      : undefined;
  const adjusted = portrait?.data ?? prepareTones(data, w, h, s, map, edges);
  const out = resizeAverage(adjusted, w, h, tw, th),
    importance = new Float32Array(tw * th),
    targetEdges = new Float32Array(tw * th),
    protectedMap = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const cell = y * tw + x;
      let imp = 0,
        edge = 0,
        n = 0,
        protectedCount = 0;
      const candidates: { l: number; i: number }[] = [];
      for (
        let yy = Math.floor((y * h) / th);
        yy < Math.floor(((y + 1) * h) / th);
        yy++
      )
        for (
          let xx = Math.floor((x * w) / tw);
          xx < Math.floor(((x + 1) * w) / tw);
          xx++
        ) {
          const i = yy * w + xx;
          imp += map.importance[i];
          edge = Math.max(edge, map.edges[i]);
          n++;
          if (map.protected[i]) {
            protectedCount++;
            candidates.push({
              i,
              l:
                adjusted[i * 4] * 0.2126 +
                adjusted[i * 4 + 1] * 0.7152 +
                adjusted[i * 4 + 2] * 0.0722,
            });
          }
        }
      importance[cell] = imp / Math.max(1, n);
      targetEdges[cell] = edge;
      protectedMap[cell] = protectedCount > n * 0.1 ? 1 : 0;
      // Preserve observed dark detail during reduction, never synthesize feature shapes.
      if (protectedCount && edge > 0.12) {
        candidates.sort((a, b) => a.l - b.l);
        const dark = candidates[Math.floor(candidates.length * 0.25)],
          mean =
            out[cell * 4] * 0.2126 +
            out[cell * 4 + 1] * 0.7152 +
            out[cell * 4 + 2] * 0.0722;
        if (mean - dark.l > 7) {
          const mix = strength * 0.75;
          for (let k = 0; k < 3; k++)
            out[cell * 4 + k] =
              out[cell * 4 + k] * (1 - mix) + adjusted[dark.i * 4 + k] * mix;
        }
      }
    }
  return {
    data: out,
    detailData: adjusted,
    detailImportance: map.importance,
    portraitEvidence: portrait?.evidence,
    features: {
      importance,
      edges: targetEdges,
      protected: protectedMap,
      strength,
    },
  };
}
export function featureMetrics(
  art: Artwork,
  input: Uint8ClampedArray,
  features: FeatureData,
  analysis: SubjectAnalysis | undefined,
  rect: Box,
  s: Settings,
): FeatureMetrics {
  const w = art.width,
    h = art.height,
    luma = art.palette.map((m) => {
      const r = parseInt(m.hex.slice(1, 3), 16),
        g = parseInt(m.hex.slice(3, 5), 16),
        b = parseInt(m.hex.slice(5, 7), 16);
      return r * 0.2126 + g * 0.7152 + b * 0.0722;
    });
  let sourceContrast = 0,
    outputContrast = 0,
    edges = 0,
    aligned = 0;
  for (let i = 0; i < w * h; i++) {
    if (features.edges[i] < 0.2 || features.importance[i] < 0.45) continue;
    const n = [
      ...(i % w < w - 1 ? [i + 1] : []),
      ...(i < w * (h - 1) ? [i + w] : []),
    ];
    for (const j of n) {
      const li =
          input[i * 4] * 0.2126 +
          input[i * 4 + 1] * 0.7152 +
          input[i * 4 + 2] * 0.0722,
        lj =
          input[j * 4] * 0.2126 +
          input[j * 4 + 1] * 0.7152 +
          input[j * 4 + 2] * 0.0722;
      const a = art.assignments[i] < 0 ? 255 : luma[art.assignments[i]],
        b = art.assignments[j] < 0 ? 255 : luma[art.assignments[j]];
      sourceContrast += Math.abs(li - lj);
      outputContrast += Math.abs(a - b);
      if (Math.abs(li - lj) > 10 && Math.sign(li - lj) === Math.sign(a - b))
        aligned++;
      edges++;
    }
  }
  const warnings: string[] = [];
  let eyeSeparationCells: number | undefined;
  for (const face of analysis?.faces || []) {
    const center = (points: Point[]) => ({
      x: points.reduce((n, p) => n + p.x, 0) / points.length,
      y: points.reduce((n, p) => n + p.y, 0) / points.length,
    });
    const eyes = face.groups.eyes.map((eye) =>
      cropPoint(center(eye), rect, s.rotation),
    );
    const separation = Math.hypot(
      (eyes[0].x - eyes[1].x) * w,
      (eyes[0].y - eyes[1].y) * h,
    );
    if (
      s.priority === portraitPriority &&
      art.mode === "dots" &&
      eyes.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)
    )
      eyeSeparationCells = Math.min(eyeSeparationCells ?? Infinity, separation);
    if (separation < 3)
      warnings.push(
        "Detected eyes occupy fewer than three grid cells of separation. Crop closer, increase resolution, or choose a larger page.",
      );
    if (eyes.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1))
      warnings.push(
        "A detected eye is outside the current crop. Review framing.",
      );
  }
  if (
    !analysis?.faces.length &&
    (s.subjectKind === "Portrait" || s.priority === portraitPriority)
  )
    warnings.push(
      "No reliable face landmarks detected. Generic structure and your importance strokes are used; facial likeness is not validated.",
    );
  if (art.mode === "lines") {
    const pitch = ((s.width - 2 * s.margin) * 25.4) / w;
    const tiny = art.regions.filter(
      (r) =>
        r.cells.length * pitch * pitch < s.regionMm2 &&
        r.cells.some((i) => features.protected[i]),
    ).length;
    if (tiny)
      warnings.push(
        `${tiny} protected regions are smaller than your preferred fill area. They were retained for review; use a larger print or simplify manually.`,
      );
  }
  return {
    sourceEdgeContrast: sourceContrast / Math.max(1, edges),
    outputEdgeContrast: outputContrast / Math.max(1, edges),
    edgeAlignment: aligned / Math.max(1, edges),
    protectedCells: features.protected.reduce((n, v) => n + v, 0),
    regions: art.mode === "lines" ? art.regions.length : art.assignments.length,
    warnings: [...new Set(warnings)],
    eyeSeparationCells,
    faceSamples: analysis?.faces.length || 0,
  };
}
