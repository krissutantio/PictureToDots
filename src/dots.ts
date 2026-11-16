import { labelLength, labelFootprint } from "./symbols";
import { freeDotMarks } from "./free-dots";
import type { Artwork, Settings } from "./types";
import { letter } from "./types";

export type DotMark = {
  id: number;
  color?: number;
  cell: number;
  x: number;
  y: number;
  diameter: number;
  font: number;
  footprint: number;
};
export type DotGeometry = {
  left: number;
  top: number;
  pitch: number;
  diameter: number;
  font: number;
};
const cache = new WeakMap<Artwork, Map<string, DotMark[]>>();
const hash = (n: number) => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/** Physical positions in points, derived from unedited saved artwork. */
export function dotMarks(a: Artwork, s: Settings, g: DotGeometry): DotMark[] {
  const key = JSON.stringify([
    s.dotLayout,
    s.dotLayoutVersion,
    s.diameter,
    s.minDot,
    s.stagger,
    g,
  ]);
  const existing = cache.get(a)?.get(key);
  if (existing) return existing;
  const result: DotMark[] = [];
  const labels =
    s.dotLayoutVersion === 3
      ? labelLength(a.palette)
      : Math.max(1, letter(a.palette.length - 1).length);
  if (s.dotLayout !== "adaptive") {
    a.assignments.forEach((color, cell) => {
      const font = Math.min(g.font, (g.pitch * 0.75) / (0.67 * labels));
      result.push({
        id: cell,
        cell,
        x:
          g.left +
          ((cell % a.width) +
            0.5 +
            (s.stagger && Math.floor(cell / a.width) % 2 ? 0.5 : 0)) *
            g.pitch,
        y: g.top + (Math.floor(cell / a.width) + 0.5) * g.pitch,
        diameter: g.diameter,
        font,
        footprint: Math.max(
          g.diameter,
          s.dotLayoutVersion === 3
            ? labelFootprint(a.palette, font)
            : font * Math.hypot(0.67 * labels, 0.75),
        ),
      });
    });
  } else if (s.dotLayoutVersion >= 2) {
    result.push(...freeDotMarks(a, s, g));
  } else {
    const minDiameter = (s.minDot * 72) / 25.4,
      maxDiameter = (s.diameter * 72) / 25.4;
    if (maxDiameter < minDiameter || g.pitch <= 0) return [];
    const bucketSize = Math.max(g.pitch, maxDiameter, 1);
    const buckets = new Map<string, DotMark[]>();
    const used = new Set<number>();
    const candidates = a.assignments
      .flatMap((color, cell) => {
        if (color < 0) return [];
        const x = cell % a.width,
          y = Math.floor(cell / a.width);
        const boundary = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(
          ([xx, yy]) =>
            xx >= 0 &&
            xx < a.width &&
            yy >= 0 &&
            yy < a.height &&
            a.assignments[yy * a.width + xx] !== color,
        );
        const importance = a.diagnostics?.importance[cell] || 0;
        return [
          {
            cell,
            detail: Math.max(boundary ? 0.85 : 0, importance),
            rank: (boundary ? 2 : 0) + importance + hash(cell + 7) * 0.3,
          },
        ];
      })
      .sort((a, b) => b.rank - a.rank || a.cell - b.cell);
    // Retry candidates at different off-grid positions to fill gaps without moving accepted marks.
    for (let pass = 0; pass < 5; pass++)
      for (const candidate of candidates) {
        const { cell, detail } = candidate;
        if (used.has(cell)) continue;
        const xx =
          (cell % a.width) + 0.15 + hash(cell * 17 + pass * 7919 + 1) * 0.7;
        const yy =
          Math.floor(cell / a.width) +
          0.15 +
          hash(cell * 31 + pass * 6151 + 13) * 0.7;
        const t = Math.max(0.05, Math.min(1, 1 - detail * 0.85));
        const diameter =
          minDiameter + (maxDiameter - minDiameter) * (0.15 + 0.85 * t);
        const font = Math.min(8, diameter * (labels > 1 ? 0.71 : 0.85));
        const footprint = Math.max(
          diameter,
          font * Math.hypot(0.67 * labels, 0.75),
        );
        // Keep a density budget tied to the chosen resolution, with extra space in flat areas.
        const packing = Math.max(footprint + 0.6, g.pitch * (0.72 + 0.35 * t));
        const mark = {
          id: cell,
          cell,
          x: g.left + xx * g.pitch,
          y: g.top + yy * g.pitch,
          diameter,
          font,
          footprint,
        };
        const radius = footprint / 2;
        if (
          xx * g.pitch < radius ||
          yy * g.pitch < radius ||
          (a.width - xx) * g.pitch < radius ||
          (a.height - yy) * g.pitch < radius
        )
          continue;
        // Reject a colored mark crossing a measured color boundary.
        const r = diameter / (2 * g.pitch);
        let crossing = false;
        for (
          let y = Math.max(0, Math.floor(yy - r));
          y <= Math.min(a.height - 1, Math.floor(yy + r));
          y++
        )
          for (
            let x = Math.max(0, Math.floor(xx - r));
            x <= Math.min(a.width - 1, Math.floor(xx + r));
            x++
          ) {
            if (a.assignments[y * a.width + x] === a.assignments[cell])
              continue;
            const dx = Math.max(x - xx, 0, xx - (x + 1)),
              dy = Math.max(y - yy, 0, yy - (y + 1));
            if (dx * dx + dy * dy < r * r) crossing = true;
          }
        if (crossing) continue;
        const bx = Math.floor(mark.x / bucketSize),
          by = Math.floor(mark.y / bucketSize);
        const reach =
          Math.ceil(Math.max(packing, maxDiameter * 1.2) / bucketSize) + 1;
        let collision = false;
        for (let y = by - reach; y <= by + reach; y++)
          for (let x = bx - reach; x <= bx + reach; x++)
            for (const other of buckets.get(`${x},${y}`) || []) {
              const otherPacking = Math.max(
                other.footprint + 0.6,
                g.pitch *
                  (0.72 +
                    0.35 *
                      Math.max(
                        0.05,
                        1 - (a.diagnostics?.importance[other.cell] || 0) * 0.85,
                      )),
              );
              if (
                Math.hypot(mark.x - other.x, mark.y - other.y) <
                Math.max(
                  (footprint + other.footprint) / 2 + 0.6,
                  (packing + otherPacking) / 2,
                )
              )
                collision = true;
            }
        if (collision) continue;
        result.push(mark);
        used.add(cell);
        const bucketKey = `${bx},${by}`;
        buckets.set(bucketKey, [...(buckets.get(bucketKey) || []), mark]);
      }
  }
  const entries = cache.get(a) || new Map<string, DotMark[]>();
  if (entries.size > 5) entries.clear();
  entries.set(key, result);
  cache.set(a, entries);
  return result;
}

const warningCache = new WeakMap<DotMark[], string[]>();
/** Advisory coverage checks, separate from physical export blockers. */
export function dotPlacementWarnings(
  a: Artwork,
  s: Settings,
  g: DotGeometry,
): string[] {
  if (s.dotLayout !== "adaptive") return [];
  const marks = dotMarks(a, s, g),
    cached = warningCache.get(marks);
  if (cached) return cached;
  const field = s.dotLayoutVersion >= 2 && a.dotField ? a.dotField : a;
  const represented = new Set(
      marks.map(
        (m) =>
          Math.min(
            field.height - 1,
            Math.floor(((m.y - g.top) / (a.height * g.pitch)) * field.height),
          ) *
            field.width +
          Math.min(
            field.width - 1,
            Math.floor(((m.x - g.left) / (a.width * g.pitch)) * field.width),
          ),
      ),
    ),
    seen = new Uint8Array(field.assignments.length);
  let missing = 0;
  for (let start = 0; start < field.assignments.length; start++) {
    if (seen[start] || field.assignments[start] < 0) continue;
    seen[start] = 1;
    const queue = [start];
    let covered = false;
    for (let q = 0; q < queue.length; q++) {
      const cell = queue[q];
      if (represented.has(cell)) covered = true;
      const x = cell % field.width,
        y = Math.floor(cell / field.width);
      for (const next of [
        ...(x ? [cell - 1] : []),
        ...(x < field.width - 1 ? [cell + 1] : []),
        ...(y ? [cell - field.width] : []),
        ...(y < field.height - 1 ? [cell + field.width] : []),
      ]) {
        if (
          !seen[next] &&
          field.assignments[next] === field.assignments[start]
        ) {
          seen[next] = 1;
          queue.push(next);
        }
      }
    }
    if (!covered) missing++;
  }
  const warnings = missing
    ? [
        `${missing} color regions have no adaptive mark at these physical sizes. Increase page size, adjust dot sizes, or use Regular grid to review small details.`,
      ]
    : [];
  warningCache.set(marks, warnings);
  return warnings;
}
