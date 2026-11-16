import { dotMarks } from "./dots";
import { letter } from "./types";
import type { FeatureData } from "./subject-types";
import type { Artwork, Marker, Region, Settings } from "./types";
export function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function lab(c: number[]): number[] {
  const [r, g, b] = c.map((v) => {
    v = Math.max(0, Math.min(255, v)) / 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  });
  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  const x = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047),
    y = f(r * 0.2126729 + g * 0.7151522 + b * 0.072175),
    z = f((r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export const distance = (a: number[], b: number[]) =>
  a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
// Greedy facility-location selection: each new ink must improve total perceptual error.
export function selectPalette(
  samples: number[][],
  markers: Marker[],
  count: number,
  weights?: number[],
): Marker[] {
  const allowed = markers.filter(
    (m) => m.enabled && /^#[\da-f]{6}$/i.test(m.hex),
  );
  if (!allowed.length) throw Error("Enable at least one valid marker swatch.");
  if (count >= allowed.length)
    return [...allowed].sort((a, b) => lab(rgb(a.hex))[0] - lab(rgb(b.hex))[0]);
  const colors = allowed.map((m) => lab(rgb(m.hex)));
  const selected: number[] = [];
  const errors = new Float64Array(samples.length).fill(Infinity);
  for (let k = 0; k < Math.min(count, allowed.length, 60); k++) {
    let best = -1,
      score = Infinity;
    for (let c = 0; c < colors.length; c++) {
      if (selected.includes(c)) continue;
      if (selected.some((i) => distance(colors[i], colors[c]) < 16)) continue;
      let total = 0;
      for (let i = 0; i < samples.length; i++)
        total +=
          Math.min(errors[i], distance(samples[i], colors[c])) *
          (weights?.[i] ?? 1);
      if (total < score) {
        score = total;
        best = c;
      }
    }
    const previousError = errors.reduce(
      (sum, value, i) => sum + value * (weights?.[i] ?? 1),
      0,
    );
    if (
      best < 0 ||
      (selected.length > 0 &&
        previousError - score <= Math.max(0.01, previousError * 0.0001))
    )
      break;
    selected.push(best);
    samples.forEach(
      (s, i) => (errors[i] = Math.min(errors[i], distance(s, colors[best]))),
    );
  }
  return selected
    .map((i) => allowed[i])
    .sort((a, b) => lab(rgb(a.hex))[0] - lab(rgb(b.hex))[0]);
}
function neighbors(i: number, w: number, h: number) {
  const n: number[] = [];
  if (i % w) n.push(i - 1);
  if (i % w < w - 1) n.push(i + 1);
  if (i >= w) n.push(i - w);
  if (i < w * (h - 1)) n.push(i + w);
  return n;
}
function components(a: number[], w: number, h: number) {
  const seen = new Uint8Array(a.length),
    groups: { color: number; cells: number[] }[] = [];
  for (let i = 0; i < a.length; i++) {
    if (seen[i]) continue;
    const cells = [i];
    seen[i] = 1;
    for (let q = 0; q < cells.length; q++)
      for (const j of neighbors(cells[q], w, h))
        if (!seen[j] && a[j] === a[i]) {
          seen[j] = 1;
          cells.push(j);
        }
    groups.push({ color: a[i], cells });
  }
  return groups;
}
// Trace the exposed grid edges into closed contours (including holes).
export function trace(cells: number[], w: number): string[] {
  const set = new Set(cells),
    edges = new Map<string, [number, number][]>();
  const add = (x: number, y: number, a: number, b: number) => {
    const key = `${x},${y}`;
    edges.set(key, [...(edges.get(key) || []), [a, b]]);
  };
  for (const i of cells) {
    const x = i % w,
      y = Math.floor(i / w);
    if (!set.has(i - w)) add(x, y, x + 1, y);
    if (x === w - 1 || !set.has(i + 1)) add(x + 1, y, x + 1, y + 1);
    if (!set.has(i + w)) add(x + 1, y + 1, x, y + 1);
    if (x === 0 || !set.has(i - 1)) add(x, y + 1, x, y);
  }
  const paths: string[] = [];
  while (edges.size) {
    const start = edges.keys().next().value!;
    let key = start;
    const points: number[][] = [start.split(",").map(Number)];
    let guard = 0;
    do {
      const choices = edges.get(key);
      if (!choices?.length) break;
      const p = choices.pop()!;
      if (!choices.length) edges.delete(key);
      points.push(p);
      key = p.join(",");
    } while (key !== start && guard++ < cells.length * 8 + 8);
    if (points.length > 3) {
      const simple = points;
      paths.push("M" + simple.map((p) => p.join(" ")).join("L") + "Z");
    }
  }
  return paths;
}
export function regionsFor(a: number[], w: number, h: number): Region[] {
  return components(a, w, h).map((g, id) => {
    const set = new Set(g.cells),
      dist = new Map<number, number>(),
      queue: number[] = [];
    for (const i of g.cells)
      if (
        i % w === 0 ||
        i % w === w - 1 ||
        i < w ||
        i >= w * (h - 1) ||
        neighbors(i, w, h).some((j) => !set.has(j))
      ) {
        dist.set(i, 0.5);
        queue.push(i);
      }
    let best = queue[0] ?? g.cells[0];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      if ((dist.get(i) || 0) > (dist.get(best) || 0)) best = i;
      for (const j of neighbors(i, w, h))
        if (set.has(j) && !dist.has(j)) {
          dist.set(j, dist.get(i)! + 1);
          queue.push(j);
        }
    }
    return {
      id,
      color: g.color,
      cells: g.cells,
      paths: trace(g.cells, w),
      label: [(best % w) + 0.5, Math.floor(best / w) + 0.5],
      clearance: (dist.get(best) || 0.5) / Math.SQRT2,
    };
  });
}
export function processPixels(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  s: Settings,
  markers: Marker[],
  features?: FeatureData,
): Artwork {
  let pixels: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    let c = [data[i], data[i + 1], data[i + 2]].map(
      (v) =>
        (v * alpha + 255 * (1 - alpha) - 128) * s.contrast + 128 + s.brightness,
    );
    const gray = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    c = c.map((v) =>
      Math.max(0, Math.min(255, gray + (v - gray) * s.saturation)),
    );
    pixels.push(c);
  }
  // Range-weighted smoothing reduces texture while retaining large color boundaries.
  for (let pass = 0; pass < s.smoothing; pass++) {
    const next = pixels.map((c, i) => {
      if (features?.protected[i] && features.strength > 0.3) return c;
      const sum = [...c];
      let weight = 1;
      for (const j of neighbors(i, w, h)) {
        const d = distance(c, pixels[j]);
        const t = Math.exp(
          -d / Math.max(50, 2 * (100 - s.edgePreservation) ** 2),
        );
        weight += t;
        for (let k = 0; k < 3; k++) sum[k] += pixels[j][k] * t;
      }
      return sum.map((v) => v / weight);
    });
    pixels = next;
  }
  const stride = Math.max(1, Math.floor(pixels.length / 1800));
  const sampleIndices = pixels
    .map((_, i) => i)
    .filter((i) => i % stride === 0 || features?.protected[i]);
  const sample = sampleIndices.map((i) => lab(pixels[i]));
  const weights = features
    ? sampleIndices.map(
        (i) => 1 + features.importance[i] ** 2 * features.strength * 7,
      )
    : undefined;
  const palette = selectPalette(sample, markers, s.colors, weights),
    labs = palette.map((m) => lab(rgb(m.hex)));
  const a: number[] = [],
    working = pixels.map((c) => [...c]);
  for (let i = 0; i < working.length; i++) {
    const c = working[i];
    if (s.white && pixels[i].every((v) => v > 244)) {
      a.push(-1);
      continue;
    }
    const l = lab(c);
    let index = 0,
      best = Infinity;
    labs.forEach((v, j) => {
      let d = distance(l, v);
      if (features) {
        const imp = features.importance[i] * features.strength;
        d += (l[0] - v[0]) ** 2 * imp * 1.5;
        for (const neighbor of [i % w ? i - 1 : -1, i >= w ? i - w : -1])
          if (neighbor >= 0 && a[neighbor] >= 0 && features.edges[i] > 0.2) {
            const sourceDelta = l[0] - lab(pixels[neighbor])[0];
            if (Math.abs(sourceDelta) > 5) {
              const outputDelta = v[0] - labs[a[neighbor]][0];
              d += (outputDelta - sourceDelta) ** 2 * imp * 0.45;
            }
          }
      }
      if (d < best) {
        best = d;
        index = j;
      }
    });
    a.push(index);
    if (s.mode === "dots" && s.dither && !features?.protected[i]) {
      const target = rgb(palette[index].hex);
      for (const [dx, dy, weight] of [
        [1, 0, 7 / 16],
        [-1, 1, 3 / 16],
        [0, 1, 5 / 16],
        [1, 1, 1 / 16],
      ]) {
        const x = (i % w) + dx,
          y = Math.floor(i / w) + dy;
        if (x >= 0 && x < w && y < h)
          for (let k = 0; k < 3; k++)
            working[y * w + x][k] += (c[k] - target[k]) * weight;
      }
    }
  }
  if (s.mode === "dots" && !s.dither && s.smoothing) {
    const original = [...a];
    for (let i = 0; i < a.length; i++) {
      if (features?.protected[i] && features.strength > 0.3) continue;
      const n = neighbors(i, w, h),
        counts = new Map<number, number>();
      n.forEach((j) =>
        counts.set(original[j], (counts.get(original[j]) || 0) + 1),
      );
      for (const [color, count] of counts)
        if (count >= 3 && !n.some((j) => original[j] === original[i]))
          a[i] = color;
    }
  }
  const pitch = (geometry(s, w, h).pitch * 25.4) / 72;
  const minRegion = Math.max(
    s.minRegion,
    Math.ceil(s.regionMm2 / (pitch * pitch)),
  );
  if (s.mode === "lines") {
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (const g of components(a, w, h)) {
        if (g.cells.length >= minRegion) continue;
        if (
          features &&
          features.strength > 0.3 &&
          g.cells.some((i) => features.protected[i]) &&
          g.cells.length >= Math.max(1, Math.floor(s.minFeatureSize ** 2 * 0.5))
        )
          continue;
        const adjacent = new Map<number, number>();
        for (const i of g.cells)
          for (const j of neighbors(i, w, h))
            if (a[j] !== g.color)
              adjacent.set(a[j], (adjacent.get(a[j]) || 0) + 1);
        if (!adjacent.size) continue;
        const color = [...adjacent].sort((a, b) => b[1] - a[1])[0][0];
        g.cells.forEach((i) => (a[i] = color));
        changed = true;
      }
      if (!changed) break;
    }
  }
  if (s.background !== "keep") {
    const groups = components(a, w, h);
    const borderCount = (g: { cells: number[] }) =>
      g.cells.filter(
        (i) => i < w || i >= w * (h - 1) || i % w === 0 || i % w === w - 1,
      ).length;
    const bg = groups.reduce(
      (best, g) => (borderCount(g) > borderCount(best) ? g : best),
      groups[0],
    );
    if (s.background === "remove")
      bg.cells.forEach((i) => {
        if (!features?.protected[i]) a[i] = -1;
      });
    else
      for (const g of groups)
        if (g !== bg && borderCount(g) > 0 && g.cells.length < minRegion * 4)
          g.cells.forEach((i) => (a[i] = bg.color));
  }
  return {
    mode: s.mode,
    width: w,
    height: h,
    assignments: a,
    palette,
    regions:
      s.mode === "lines"
        ? simplifyRegions(regionsFor(a, w, h), w, h, s.simplification)
        : [],
  };
}
export function geometry(s: Settings, w: number, h: number) {
  const width = s.width * 72,
    height = s.height * 72,
    left = s.margin * 72,
    top =
      (s.margin + s.binding) * 72 +
      25 +
      Math.max(
        0,
        Math.ceil(
          Math.min(60, s.colors) / legendCapacity(s.width * 72, s.margin * 72),
        ) - 1,
      ) *
        12;
  const areaW = width - 2 * left,
    areaH = height - top - s.margin * 72 - 24;
  const pitch = Math.min(areaW / (w + 0.5), areaH / h);
  return {
    width,
    height,
    left: left + (areaW - w * pitch) / 2,
    top,
    pitch,
    diameter: Math.min((s.diameter * 72) / 25.4, pitch * 0.88),
    font: Math.min(6, pitch * 0.58),
  };
}
export function printWarnings(s: Settings, a: Artwork): string[] {
  const g = geometry(s, a.width, a.height);
  const warnings: string[] = [];
  if (g.pitch <= 0) warnings.push("Margins leave no printable area.");
  const marks = s.mode === "dots" ? dotMarks(a, s, g) : [];
  if (
    s.mode === "dots" &&
    (s.dotLayout === "adaptive"
      ? s.diameter < s.minDot
      : (g.diameter * 25.4) / 72 < s.minDot)
  )
    warnings.push(
      "Dots are below your minimum diameter. Reduce resolution or increase page size.",
    );
  if (
    s.mode === "dots" &&
    s.labels &&
    (marks.length ? marks.some((m) => m.font < 3) : g.font < 3)
  )
    warnings.push(
      "Letters are smaller than 3 pt. Reduce resolution before printing.",
    );
  if (
    s.mode === "dots" &&
    s.dotLayout === "adaptive" &&
    a.assignments.some((c) => c >= 0) &&
    !marks.length
  )
    warnings.push(
      "No adaptive marks fit these physical limits. Increase page size, reduce resolution or adjust mark diameters.",
    );
  if (s.mode === "lines") {
    const n = a.regions.filter(
      (r) => r.color >= 0 && !labelFits(r, s, g.pitch),
    ).length;
    if (n && s.lineLabels)
      warnings.push(
        `${n} regions are too narrow to label; labels are omitted. Merge or recolor them before printing.`,
      );
  }
  return warnings;
}

// Simplify shared boundaries with identical anchors on both neighboring regions.
// Junctions are pinned, so adjacent colors retain matching outlines.
export function simplifyRegions(
  regions: Region[],
  w: number,
  h: number,
  tolerance = 0.65,
): Region[] {
  const ids = new Int32Array(w * h);
  regions.forEach((r) => r.cells.forEach((i) => (ids[i] = r.id)));
  const pinned = new Set<string>();
  for (let y = 0; y <= h; y++)
    for (let x = 0; x <= w; x++) {
      const touching = new Set<number>();
      for (const [dx, dy] of [
        [-1, -1],
        [0, -1],
        [-1, 0],
        [0, 0],
      ]) {
        const xx = x + dx,
          yy = y + dy;
        touching.add(
          xx < 0 || xx >= w || yy < 0 || yy >= h ? -1 : ids[yy * w + xx],
        );
      }
      if (touching.size > 2 || ((x === 0 || x === w) && (y === 0 || y === h)))
        pinned.add(`${x},${y}`);
    }
  type Point = number[];
  const code = (p: Point) => p[1] * (w + 1) + p[0];
  const rdp = (points: Point[]): Point[] => {
    if (points.length <= 2) return points;
    const a = points[0],
      b = points[points.length - 1];
    let max = 0,
      index = 0;
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      den = dx * dx + dy * dy;
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i],
        t = den
          ? Math.max(
              0,
              Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / den),
            )
          : 0;
      const d = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
      if (d > max) {
        max = d;
        index = i;
      }
    }
    return max > tolerance * tolerance
      ? [
          ...rdp(points.slice(0, index + 1)).slice(0, -1),
          ...rdp(points.slice(index)),
        ]
      : [a, b];
  };
  const simplify = (points: Point[]) =>
    code(points[0]) > code(points[points.length - 1])
      ? rdp([...points].reverse()).reverse()
      : rdp(points);
  return regions.map((r) => ({
    ...r,
    paths: r.paths.map((path) => {
      const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      let points = Array.from({ length: values.length / 2 }, (_, i) =>
        values.slice(i * 2, i * 2 + 2),
      );
      if (code(points[0]) === code(points[points.length - 1])) points.pop();
      let anchors = points
        .map((p, i) => (pinned.has(p.join(",")) ? i : -1))
        .filter((i) => i >= 0);
      if (anchors.length < 2) {
        let first = 0;
        points.forEach((p, i) => {
          if (code(p) < code(points[first])) first = i;
        });
        let second = first;
        points.forEach((p, i) => {
          const d = distance(p, points[first]),
            best = distance(points[second], points[first]);
          if (d > best || (d === best && code(p) < code(points[second])))
            second = i;
        });
        anchors = [...new Set([...anchors, first, second])].sort(
          (a, b) => a - b,
        );
      }
      const result: Point[] = [];
      for (let i = 0; i < anchors.length; i++) {
        const a = anchors[i],
          b = anchors[(i + 1) % anchors.length];
        const segment =
          b > a
            ? points.slice(a, b + 1)
            : [...points.slice(a), ...points.slice(0, b + 1)];
        result.push(...simplify(segment).slice(0, -1));
      }
      return result.length >= 3
        ? "M" + result.map((p) => p.join(" ")).join("L") + "Z"
        : path;
    }),
  }));
}
export const labelFits = (r: Region, s: Settings, pitch: number) =>
  (r.clearance - s.simplification) * pitch >=
  Math.max(3.2, letter(r.color).length * 1.7);
export const legendCapacity = (width: number, margin: number) =>
  Math.max(1, Math.floor((width - 2 * margin - 25) / 22));
export function topLegend(palette: Marker[], width: number, margin: number) {
  const capacity = legendCapacity(width, margin);
  const rows = Math.ceil(palette.length / capacity);
  return Array.from({ length: rows }, (_, row) => {
    const entries = palette.slice(row * capacity, (row + 1) * capacity);
    const dark = entries.every((m) => lab(rgb(m.hex))[0] < 60);
    const light = entries.every((m) => lab(rgb(m.hex))[0] >= 60);
    return {
      label: dark ? "DARK" : light ? "LIGHT" : "INKS",
      x: margin,
      yOffset: row * 12,
      entries: entries.map((_, j) => ({
        index: row * capacity + j,
        x: margin + 25 + j * 22,
      })),
    };
  });
}
