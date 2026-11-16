import type { Artwork, Settings } from "./types";
import type { DotMark, DotGeometry } from "./dots";
import { letter } from "./types";
const random = (n: number) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

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
  const labels = Math.max(1, letter(a.palette.length - 1).length),
    bucketSize = Math.max(max * 1.7, 1),
    buckets = new Map<string, DotMark[]>(),
    marks: DotMark[] = [];
  const attempts = Math.min(
    180000,
    Math.max(3000, Math.ceil((width * height) / (min + 0.6) ** 2) * 38),
  );
  const candidates = Array.from({ length: attempts }, (_, i) => {
    const u = random(i * 17 + 13),
      v = random(i * 31 + 107),
      fieldCell =
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
    return { i, u, v, fieldCell, cell, detail };
  })
    .filter((c) => field.assignments[c.fieldCell] >= 0)
    .sort((a, b) => b.detail - a.detail || a.i - b.i);
  for (const c of candidates) {
    const color = field.assignments[c.fieldCell];
    const diameter =
      min +
      (max - min) * (1 - c.detail) ** 1.4 * (0.88 + 0.12 * random(c.i + 997));
    const font = Math.min(9, diameter * (labels > 1 ? 0.71 : 0.85));
    const footprint = Math.max(
      diameter,
      font * Math.hypot(0.67 * labels, 0.75),
    );
    const x = c.u * width,
      y = c.v * height,
      radius = footprint / 2;
    if (x < radius || y < radius || x + radius > width || y + radius > height)
      continue;
    const bx = Math.floor(x / bucketSize),
      by = Math.floor(y / bucketSize);
    let collision = false;
    for (let yy = by - 1; yy <= by + 1 && !collision; yy++)
      for (let xx = bx - 1; xx <= bx + 1 && !collision; xx++)
        for (const other of buckets.get(`${xx},${yy}`) || [])
          if (
            Math.hypot(x + g.left - other.x, y + g.top - other.y) <
            (footprint + other.footprint) / 2 + 0.6
          ) {
            collision = true;
            break;
          }
    if (collision) continue;
    // Check the entire measured circular mark against color boundaries at field resolution.
    const rx = (diameter / 2 / width) * w,
      ry = (diameter / 2 / height) * h,
      fx = c.u * w,
      fy = c.v * h;
    let crossing = false;
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
        if (field.assignments[yy * w + xx] === color) continue;
        const dx = Math.max(xx - fx, 0, fx - xx - 1) / rx,
          dy = Math.max(yy - fy, 0, fy - yy - 1) / ry;
        if (dx * dx + dy * dy < 1) {
          crossing = true;
          break;
        }
      }
    if (crossing) continue;
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
    marks.push(mark);
    const key = `${bx},${by}`;
    buckets.set(key, [...(buckets.get(key) || []), mark]);
  }
  return marks;
}
