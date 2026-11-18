import type { Artwork, Settings } from "./types";
import type { DotMark, DotGeometry } from "./dots";
import { labelLength, labelFootprint } from "./symbols";
import { distance, lab, rgb } from "./color";
import { letter } from "./types";
const random = (n: number) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

// Template whitespace between two observed detail marks, in print points.
const detailGap = (0.45 * 72) / 25.4;
const maxAttempts = 180000;
const ridgeNormals = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
] as const;

/** A subpixel maximum across contrast that continues along the ridge. */
function observedRidge(evidence: number[], w: number, i: number) {
  const center = evidence[i];
  let strongest = 0;
  let ridge: { dx: number; dy: number; coherence: number } | undefined;
  for (const [dx, dy] of ridgeNormals) {
    const step = dx + dy * w;
    const before = evidence[i - step];
    const after = evidence[i + step];
    if (before > center || after > center) continue;
    const curvature = center * 2 - before - after;
    if (curvature <= 0) continue;
    const tangent = dy - dx * w;
    const coherence = Math.min(evidence[i - tangent], evidence[i + tangent]);
    const strength = (coherence * curvature) / (dx * dx + dy * dy);
    if (strength <= strongest) continue;
    const offset = (0.5 * (after - before)) / curvature;
    strongest = strength;
    ridge = { dx: dx * offset, dy: dy * offset, coherence };
  }
  return ridge;
}

/** Continuous candidates and variable-radius packing; no per-cell quota or lattice anchors. */
export function freeDotMarks(
  a: Artwork,
  s: Settings,
  g: DotGeometry,
): DotMark[] {
  const field = a.dotField || {
    width: a.width,
    height: a.height,
    assignments: a.assignments,
    importance: a.diagnostics?.importance,
  };
  const w = field.width,
    h = field.height,
    width = a.width * g.pitch,
    height = a.height * g.pitch;
  const min = (s.minDot * 72) / 25.4,
    max = (s.diameter * 72) / 25.4;
  if (g.pitch <= 0 || min > max) return [];
  const clearance = new Float32Array(w * h).fill(w + h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x,
        color = field.assignments[i];
      if (
        !x ||
        !y ||
        x === w - 1 ||
        y === h - 1 ||
        field.assignments[i - 1] !== color ||
        field.assignments[i + 1] !== color ||
        field.assignments[i - w] !== color ||
        field.assignments[i + w] !== color
      )
        clearance[i] = 0.5;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x) clearance[i] = Math.min(clearance[i], clearance[i - 1] + 1);
      if (y) clearance[i] = Math.min(clearance[i], clearance[i - w] + 1);
      if (x && y)
        clearance[i] = Math.min(
          clearance[i],
          clearance[i - w - 1] + Math.SQRT2,
        );
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x < w - 1)
        clearance[i] = Math.min(clearance[i], clearance[i + 1] + 1);
      if (y < h - 1)
        clearance[i] = Math.min(clearance[i], clearance[i + w] + 1);
      if (x < w - 1 && y < h - 1)
        clearance[i] = Math.min(
          clearance[i],
          clearance[i + w + 1] + Math.SQRT2,
        );
    }
  const reference = s.dotLayoutVersion === 3,
    portraitV3 = reference ? a.dotField?.portraitV3 : undefined,
    portraitDetail =
      portraitV3 ?? (reference ? a.dotField?.portraitV2 : undefined),
    portrait =
      portraitDetail?.evidence ??
      (reference ? a.dotField?.portraitV1 : undefined),
    spacing = reference ? 1.35 : 1,
    gap = reference ? 1.2 : 0.6;
  const labels = reference
      ? labelLength(a.palette)
      : Math.max(1, letter(a.palette.length - 1).length),
    glyphScale = reference ? labelFootprint(a.palette, 1) : 0,
    fontFor = (diameter: number) =>
      Math.min(9, diameter * (labels > 1 ? 0.71 : 0.85)),
    maxFootprint = Math.max(max, fontFor(max) * glyphScale),
    bucketSize = Math.max(
      max * (reference ? 2.3 : 1.7),
      portraitV3 ? maxFootprint * spacing + gap : 1,
    ),
    bucketColumns = Math.ceil(width / bucketSize),
    bucketRows = Math.ceil(height / bucketSize),
    buckets: (DotMark[] | undefined)[] = new Array(bucketColumns * bucketRows),
    marks: DotMark[] = [];
  const reservedMarks = portraitV3 && new Set<DotMark>();
  const paletteLab = portraitDetail
    ? a.palette.map((marker) => lab(rgb(marker.hex)))
    : [];
  const similarInk = paletteLab.map((ink) =>
    paletteLab.map(
      (other) =>
        Math.abs(ink[0] - other[0]) <= 11 && distance(ink, other) <= 18 ** 2,
    ),
  );
  const diskCoverage = (
    fx: number,
    fy: number,
    diameter: number,
    color: number,
    minimum: number,
  ) => {
    const rx = (diameter / 2 / width) * w,
      ry = (diameter / 2 / height) * h;
    if (fx < rx || fy < ry || fx + rx > w || fy + ry > h) return 0;
    const matches = similarInk[color];
    let covered = 0,
      supported = 0,
      fullySupported = true;
    for (
      let y = Math.floor(fy - ry);
      y <= Math.min(h - 1, Math.floor(fy + ry));
      y++
    )
      for (
        let x = Math.floor(fx - rx);
        x <= Math.min(w - 1, Math.floor(fx + rx));
        x++
      ) {
        const ink = field.assignments[y * w + x];
        const dx = Math.max(x - fx, 0, fx - x - 1) / rx,
          dy = Math.max(y - fy, 0, fy - y - 1) / ry;
        if (dx * dx + dy * dy >= 1) continue;
        if (ink < 0) return 0;
        if (!matches[ink]) fullySupported = false;
        let weight = 0;
        for (const oy of [0.25, 0.75])
          for (const ox of [0.25, 0.75])
            if (((x + ox - fx) / rx) ** 2 + ((y + oy - fy) / ry) ** 2 < 1)
              weight++;
        covered += weight;
        if (matches[ink]) supported += weight;
      }
    // A subcell-sized disk can fall between all four sample points.
    const coverage = covered ? supported / covered : Number(fullySupported);
    return coverage >= minimum ? coverage : 0;
  };
  const attempts = Math.min(
    maxAttempts,
    Math.max(3000, Math.ceil((width * height) / (min + 0.6) ** 2) * 38),
  );
  const candidate = (i: number, u: number, v: number, coherence = 0) => {
    const fieldCell =
      Math.min(h - 1, Math.floor(v * h)) * w +
      Math.min(w - 1, Math.floor(u * w));
    const cell =
      Math.min(a.height - 1, Math.floor(v * a.height)) * a.width +
      Math.min(a.width - 1, Math.floor(u * a.width));
    const importance =
      field.importance?.[fieldCell] ?? a.diagnostics?.importance[cell] ?? 0;
    const available = clearance[fieldCell] * Math.min(width / w, height / h);
    const detail = Math.max(
      importance * 0.9,
      Math.max(0, 1 - available / (max * 1.5)),
    );
    const evidence = portrait?.[fieldCell] ?? 0;
    const color = field.assignments[fieldCell];
    const coverage =
      portraitDetail && evidence > 0.22 && color >= 0
        ? diskCoverage(u * w, v * h, min, color, 0.25)
        : 0;
    const priority = portraitDetail
      ? Math.sqrt(coverage) * (0.45 + evidence) * (1 + 0.2 * coherence)
      : evidence > 0.22
        ? evidence
        : 0;
    return { i, u, v, fieldCell, cell, detail, priority };
  };
  const candidates = Array.from({ length: attempts }, (_, i) =>
    candidate(i, random(i * 17 + 13), random(i * 31 + 107)),
  );
  if (portraitV3) {
    const { evidence } = portraitV3;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (evidence[i] <= 0.22 || field.assignments[i] < 0) continue;
        const ridge = observedRidge(evidence, w, i);
        if (!ridge) continue;
        const c = candidate(
          maxAttempts + i,
          (x + 0.5 + ridge.dx * 0.98) / w,
          (y + 0.5 + ridge.dy * 0.98) / h,
          ridge.coherence,
        );
        if (c.priority > 0) candidates.push(c);
      }
  }
  const ordered = candidates
    .filter((c) => field.assignments[c.fieldCell] >= 0)
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        (reference ? a.detail - b.detail : b.detail - a.detail) ||
        a.i - b.i,
    );
  for (const c of ordered) {
    const color = field.assignments[c.fieldCell];
    const reserved = c.priority > 0;
    const diameter = reserved
      ? min
      : min +
        (max - min) * (1 - c.detail) ** 1.4 * (0.88 + 0.12 * random(c.i + 997));
    const font = fontFor(diameter);
    const footprint = reference
      ? Math.max(diameter, font * glyphScale)
      : Math.max(diameter, font * Math.hypot(0.67 * labels, 0.75));
    const x = c.u * width,
      y = c.v * height,
      radius = footprint / 2;
    if (x < radius || y < radius || x + radius > width || y + radius > height)
      continue;
    const bx = Math.floor(x / bucketSize),
      by = Math.floor(y / bucketSize);
    let collision = false;
    for (
      let yy = Math.max(by - 1, 0);
      yy < Math.min(by + 2, bucketRows) && !collision;
      yy++
    )
      for (
        let xx = Math.max(bx - 1, 0);
        xx < Math.min(bx + 2, bucketColumns) && !collision;
        xx++
      ) {
        const bucket = buckets[yy * bucketColumns + xx];
        if (!bucket) continue;
        for (const other of bucket) {
          const radii = (footprint + other.footprint) / 2;
          const compact = reserved && reservedMarks?.has(other);
          if (
            Math.hypot(x + g.left - other.x, y + g.top - other.y) <
            (compact ? radii + detailGap : radii * spacing + gap)
          ) {
            collision = true;
            break;
          }
        }
      }
    if (collision) continue;
    // Reserved centers have already passed the minimum-size disk check.
    // For their neighboring facial tones, nearby inks can support a single mark.
    if (!(portraitDetail && reserved)) {
      const fits = portraitDetail?.toneArea[c.cell]
        ? diskCoverage(c.u * w, c.v * h, diameter, color, 0.78) > 0
        : legacyDiskFits(c.u * w, c.v * h, diameter, color, reserved);
      if (!fits) continue;
    }
    const mark = {
      id: a.assignments.length + c.i,
      cell: c.cell,
      color,
      x: g.left + x,
      y: g.top + y,
      diameter,
      font,
      footprint,
    };
    if (reserved) reservedMarks?.add(mark);
    marks.push(mark);
    (buckets[by * bucketColumns + bx] ??= []).push(mark);
  }
  return marks;

  // Preserve the full-ink footprint and original reservation checks used
  // by artwork saved before portraitV2.
  function legacyDiskFits(
    fx: number,
    fy: number,
    diameter: number,
    color: number,
    reserved: boolean,
  ) {
    const rx = (diameter / 2 / width) * w,
      ry = (diameter / 2 / height) * h;
    let crossing = false,
      covered = 0,
      supported = 0;
    // For a measured dark feature only, accept a minimum-size dot with its
    // center on the feature and enough same-ink support under its footprint.
    // Keep paper cutouts and all normal v1–v3 boundary checks intact.
    for (
      let yy = Math.max(0, Math.floor(fy - ry));
      yy <= Math.min(h - 1, Math.floor(fy + ry)) && !crossing;
      yy++
    )
      for (
        let xx = Math.max(0, Math.floor(fx - rx));
        xx <= Math.min(w - 1, Math.floor(fx + rx));
        xx++
      ) {
        const ink = field.assignments[yy * w + xx];
        if (reserved) {
          let weight = 0;
          for (const oy of [0.25, 0.75])
            for (const ox of [0.25, 0.75])
              if (((xx + ox - fx) / rx) ** 2 + ((yy + oy - fy) / ry) ** 2 < 1)
                weight++;
          covered += weight;
          if (ink === color) supported += weight;
        }
        if (ink === color || (reserved && ink >= 0)) continue;
        const dx = Math.max(xx - fx, 0, fx - xx - 1) / rx,
          dy = Math.max(yy - fy, 0, fy - yy - 1) / ry;
        if (dx * dx + dy * dy < 1) {
          crossing = true;
          break;
        }
      }
    return (
      !crossing && (!reserved || (covered > 0 && supported / covered >= 0.34))
    );
  }
}
