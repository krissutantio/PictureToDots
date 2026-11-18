import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { markerLabel } from "../src/symbols";
import { dotMarks } from "../src/dots";
import {
  geometry,
  printWarnings,
  selectPalette,
  topLegend,
} from "../src/processing";
import { defaults, letter, type Artwork, type Project } from "../src/types";
import { artworkSVG } from "../src/render";
import { artworkPDF, keyPDF } from "../src/export";
import { validateProject } from "../src/storage";
import { PDFDocument } from "pdf-lib";
import palette from "../src/palettes.json";
const art = (): Artwork => ({
  mode: "dots",
  width: 24,
  height: 28,
  palette: palette.markers,
  regions: [],
  assignments: Array.from({ length: 24 * 28 }, (_, i) =>
    i % 24 < 12 ? 0 : 59,
  ),
});
const settings = {
  ...defaults,
  dotLayout: "adaptive" as const,
  minDot: 1.5,
  diameter: 3.2,
};
const project = (): Project => ({
  version: 1,
  id: "adaptive",
  title: "Adaptive study",
  image: "data:image/png;base64,",
  updated: 0,
  settings: { ...settings },
  palette,
  art: art(),
  edits: {},
});

describe("adaptive physical placement", () => {
  it("packs deterministic off-grid marks with variable size, safe bounds and non-overlapping letter footprints", () => {
    const a = art(),
      g = geometry(settings, a.width, a.height),
      marks = dotMarks(a, settings, g);
    expect(marks.length).toBeGreaterThan(100);
    expect(dotMarks(a, { ...settings, labels: false }, g)).toEqual(marks);
    expect(new Set(marks.map((m) => m.id)).size).toBe(marks.length);
    expect(new Set(marks.map((m) => m.cell)).size).toBeLessThan(marks.length);
    expect(
      new Set(marks.map((m) => m.diameter.toFixed(3))).size,
    ).toBeGreaterThan(1);
    expect(new Set(marks.map((m) => m.y.toFixed(3))).size).toBeGreaterThan(
      a.height * 3,
    );
    expect(dotMarks(JSON.parse(JSON.stringify(a)), settings, g)).toEqual(marks);
    for (const [i, m] of marks.entries()) {
      expect((m.diameter * 25.4) / 72).toBeGreaterThanOrEqual(settings.minDot);
      expect((m.diameter * 25.4) / 72).toBeLessThanOrEqual(settings.diameter);
      expect(m.font).toBeGreaterThanOrEqual(3);
      expect(m.x - m.footprint / 2).toBeGreaterThanOrEqual(g.left);
      expect(m.y - m.footprint / 2).toBeGreaterThanOrEqual(g.top);
      expect(m.x + m.footprint / 2).toBeLessThanOrEqual(
        g.left + a.width * g.pitch,
      );
      expect(m.y + m.footprint / 2).toBeLessThanOrEqual(
        g.top + a.height * g.pitch,
      );
      for (const n of marks.slice(i + 1))
        expect(Math.hypot(m.x - n.x, m.y - n.y) + 1e-8).toBeGreaterThanOrEqual(
          (m.footprint + n.footprint) / 2 + 0.6,
        );
    }
    const edge = marks.filter(
      (m) =>
        [11, 12].includes(m.cell % 24) && m.cell >= 24 * 3 && m.cell < 24 * 25,
    );
    const flat = marks.filter(
      (m) =>
        [3, 20].includes(m.cell % 24) && m.cell >= 24 * 3 && m.cell < 24 * 25,
    );
    expect(edge.length).toBeGreaterThan(0);
    const mean = (items: typeof marks) =>
      items.reduce((sum, m) => sum + m.diameter, 0) / items.length;
    expect(mean(edge)).toBeLessThan(mean(flat));
  });
  it("uses measured colors, leaves paper blank, preserves positions through recoloring and rejects impossible sizes", async () => {
    const p = project(),
      a = p.art!,
      g = geometry(settings, a.width, a.height);
    a.assignments[0] = -1;
    const marks = dotMarks(a, settings, g);
    expect(marks.some((m) => m.cell === 0)).toBe(false);
    const before = artworkSVG(p);
    p.edits[marks[0].cell] = 59;
    const after = artworkSVG(p);
    const circles = (svg: string) =>
      Array.from(
        svg.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g),
        (m) => m.slice(1),
      );
    expect(circles(after)).toEqual(circles(before));
    expect(after.includes(`data-symbol="${palette.markers[59].symbol}"`)).toBe(
      true,
    );
    expect(validateProject(JSON.parse(JSON.stringify(p)))).toBe(true);
    const impossible = { ...settings, diameter: 1, minDot: 3 };
    expect(printWarnings(impossible, a).length).toBeGreaterThan(0);
    await expect(artworkPDF([{ ...p, settings: impossible }])).rejects.toThrow(
      "dense",
    );
  });
});

describe("full 60-color defaults and printable keys", () => {
  it("enables 60 honest starter swatches, unique letter labels and exact full-set selection", () => {
    expect(defaults.colors).toBe(60);
    expect(palette.markers).toHaveLength(60);
    expect(palette.markers.every((m) => m.enabled)).toBe(true);
    expect(palette.verified).toBe(false);
    expect(palette.note).toContain("not calibrated physical ink");
    const labels = palette.markers.map(markerLabel);
    expect(new Set(labels).size).toBe(60);
    expect(labels.every((l) => Array.from(l).length === 1)).toBe(true);
    const codes = [
      1, 2, 3, 4, 6, 7, 8, 9, 11, 15, 17, 18, 20, 23, 24, 27, 28, 29, 30, 31,
      32, 33, 35, 38, 39, 40, 41, 42, 45, 46, 48, 49, 50, 51, 52, 53, 54, 56,
      58, 60, 61, 62, 63, 64, 66, 67, 70, 72, 73, 75, 76, 81, 82, 83, 85, 87,
      88, 93, 99, 100,
    ];
    expect(palette.markers.map((m) => Number(m.code))).toEqual(codes);
    expect(
      labels.some((l) => ["I", "O", "B", "S", "Z", "G", "0", "5"].includes(l)),
    ).toBe(false);
    const selected = selectPalette(
      [
        [30, 20, 10],
        [80, -20, 10],
      ],
      palette.markers,
      4,
    );
    for (const m of selected)
      expect(markerLabel(m, 0)).toBe(
        palette.markers.find((p) => p.id === m.id)!.symbol,
      );
    expect(selectPalette([[0, 0, 0]], palette.markers, 60)).toHaveLength(60);
    expect(
      selectPalette(
        [[0, 0, 0]],
        palette.markers.map((m, i) => ({ ...m, enabled: i !== 59 })),
        60,
      ),
    ).toHaveLength(59);
    expect(
      selectPalette([[0, 0, 0]], palette.markers, 4).length,
    ).toBeLessThanOrEqual(4);
  });
  it("wraps top legends, paginates keys, and migrates missing layout without replacing old budgets", async () => {
    const p = project(),
      g = geometry(settings, 24, 28),
      rows = topLegend(palette.markers, g.width, settings.margin * 72);
    expect(rows.flatMap((r) => r.entries)).toHaveLength(60);
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(row.entries.at(-1)!.x + 18).toBeLessThan(
        g.width - settings.margin * 72,
      );
      expect(
        (settings.margin + settings.binding) * 72 + 15 + row.yOffset,
      ).toBeLessThan(g.top);
    }
    const pdf = await PDFDocument.load(await artworkPDF([p]));
    expect(pdf.getPage(0).getSize()).toEqual({ width: 360, height: 504 });
    const keys = await PDFDocument.load(await keyPDF([p]));
    expect(keys.getPageCount()).toBe(4);
    const overview = await PDFDocument.load(await keyPDF([p, p]));
    expect(overview.getPageCount()).toBe(9);
    const tooSmall = {
      ...p,
      settings: {
        ...settings,
        mode: "lines" as const,
        width: 3,
        height: 3,
        margin: 0.6,
        binding: 0.9,
      },
    };
    tooSmall.art = { ...p.art!, mode: "lines" };
    await expect(artworkPDF([tooSmall])).rejects.toThrow(
      "no printable artwork area",
    );
    const legacy = project();
    legacy.settings = { ...defaults, colors: 6 };
    delete (legacy.settings as Partial<typeof defaults>).dotLayout;
    expect(validateProject(legacy)).toBe(true);
    expect(legacy.settings.dotLayout).toBe("regular");
    expect(legacy.settings.colors).toBe(6);
    expect(
      validateProject({
        ...project(),
        settings: { ...settings, dotLayout: "invalid" },
      }),
    ).toBe(false);
  });
});

describe("continuous adaptive layout compatibility", () => {
  it("retains legacy adaptive geometry until explicitly upgraded", () => {
    const p = project();
    delete (p.settings as Partial<typeof defaults>).dotLayoutVersion;
    const old = dotMarks(p.art!, p.settings, geometry(p.settings, 24, 28));
    expect(validateProject(p)).toBe(true);
    expect(p.settings.dotLayoutVersion).toBe(1);
    expect(dotMarks(p.art!, p.settings, geometry(p.settings, 24, 28))).toEqual(
      old,
    );
    expect(new Set(old.map((m) => m.cell)).size).toBe(old.length);
    const upgraded = dotMarks(
      p.art!,
      { ...p.settings, dotLayoutVersion: 2 },
      geometry(p.settings, 24, 28),
    );
    expect(upgraded.some((m) => m.id >= p.art!.assignments.length)).toBe(true);
  });
  it("uses higher-resolution observed detail and recolors individual free marks independently", () => {
    const p = project(),
      a = p.art!;
    a.assignments.fill(0);
    a.dotField = {
      width: 96,
      height: 112,
      assignments: Array.from({ length: 96 * 112 }, (_, i) =>
        i % 96 >= 40 &&
        i % 96 < 56 &&
        Math.floor(i / 96) >= 40 &&
        Math.floor(i / 96) < 60
          ? 1
          : 0,
      ),
    };
    const marks = dotMarks(
      a,
      p.settings,
      geometry(p.settings, a.width, a.height),
    );
    expect(marks.some((m) => m.color === 1)).toBe(true);
    const first = marks.find((m) =>
      marks.some((n) => n.id !== m.id && n.cell === m.cell),
    )!;
    const other = marks.find(
      (m) => m.id !== first.id && m.cell === first.cell,
    )!;
    p.edits[first.id] = 2;
    const svg = artworkSVG(p, true);
    const group = (id: number) =>
      svg.split(`<g data-cell="${id}"`)[1].split("</g>")[0];
    expect(group(first.id)).toContain(`fill="${a.palette[2].hex}"`);
    expect(group(other.id)).toContain(`fill="${a.palette[other.color!].hex}"`);
    expect(validateProject(JSON.parse(JSON.stringify(p)))).toBe(true);
    const bad = JSON.parse(JSON.stringify(p));
    bad.art.dotField.assignments[0] = 1000;
    expect(validateProject(bad)).toBe(false);
  });
});

describe("reference spacing and stable marker metadata", () => {
  it("leaves breathing room instead of filling every possible gap", () => {
    const a = art(),
      g = geometry(settings, a.width, a.height);
    const dense = dotMarks(a, { ...settings, dotLayoutVersion: 2 }, g),
      reference = dotMarks(a, { ...settings, dotLayoutVersion: 3 }, g);
    expect(reference.length).toBeLessThan(dense.length * 0.85);
    for (let i = 0; i < reference.length; i++)
      for (let j = i + 1; j < reference.length; j++) {
        const a = reference[i],
          b = reference[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y) + 1e-8).toBeGreaterThanOrEqual(
          ((a.footprint + b.footprint) / 2) * 1.35 + 1.2,
        );
      }
  });
  it("shows current physical codes in SVG and PDF without moving or recoloring the artwork", async () => {
    const p = project(),
      before = dotMarks(p.art!, p.settings, geometry(p.settings, 24, 28));
    p.palette = {
      ...p.palette,
      markers: p.palette.markers.map((m, i) =>
        i === 0 ? { ...m, code: "137" } : m,
      ),
    };
    p.edits[before[0].id] = 1;
    const svg = artworkSVG(p, true);
    expect(svg.includes(">137</text>")).toBe(true);
    expect(dotMarks(p.art!, p.settings, geometry(p.settings, 24, 28))).toEqual(
      before,
    );
    expect((await PDFDocument.load(await artworkPDF([p]))).getPageCount()).toBe(
      1,
    );
  });
});

it("fits measured thin detail with minimum-size dots only in portrait packing", () => {
  const p = project(),
    a = p.art!,
    w = 96,
    h = 112;
  p.settings = { ...p.settings, priority: "Portrait Simplification" };
  const s = p.settings,
    g = geometry(s, a.width, a.height);
  // A 1.3 mm observed stroke is narrower than the 1.5 mm physical dot limit.
  const stroke = (i: number) => i % w === 45;
  a.dotField = {
    width: w,
    height: h,
    assignments: Array.from({ length: w * h }, (_, i) => (stroke(i) ? 0 : 59)),
  };
  const ordinary = dotMarks(a, s, g);
  expect(ordinary.some((m) => m.color === 0)).toBe(false);
  const withEvidence = {
    ...a,
    dotField: {
      ...a.dotField,
      portraitV1: Array.from({ length: w * h }, (_, i) =>
        stroke(i) ? 0.8 : 0,
      ),
    },
  };
  const marks = dotMarks(withEvidence, s, g);
  // Original portraitV1 output for this saved field and these settings.
  expect(createHash("sha256").update(JSON.stringify(marks)).digest("hex")).toBe(
    "cde4378c2097877322f27f0f3a890fb61c10e3e2293197f04ed3eb2ebddc8b1f",
  );
  const protectedDots = marks.filter((m) => m.color === 0);
  expect(protectedDots.length).toBeGreaterThan(4);
  for (const m of protectedDots) {
    expect((m.diameter * 25.4) / 72).toBeCloseTo(s.minDot);
    expect(Math.floor(((m.x - g.left) / (a.width * g.pitch)) * w)).toBe(45);
  }
  for (const [i, m] of marks.entries())
    for (const n of marks.slice(i + 1))
      expect(Math.hypot(m.x - n.x, m.y - n.y) + 1e-8).toBeGreaterThanOrEqual(
        (1.35 * (m.footprint + n.footprint)) / 2 + 1.2,
      );
  expect(dotMarks(withEvidence, { ...s, dotLayoutVersion: 2 }, g)).toEqual(
    dotMarks(a, { ...s, dotLayoutVersion: 2 }, g),
  );
  p.art = withEvidence;
  expect(validateProject(JSON.parse(JSON.stringify(p)))).toBe(true);
  expect(dotMarks(JSON.parse(JSON.stringify(withEvidence)), s, g)).toEqual(
    marks,
  );
  expect(
    validateProject({
      ...p,
      art: {
        ...withEvidence,
        dotField: { ...withEvidence.dotField, portraitV1: [1.5] },
      },
    }),
  ).toBe(false);
});

it("fits portrait tones across nearby inks without crossing paper cutouts or changing physical mark limits", () => {
  const p = project(),
    a = p.art!,
    w = 120,
    h = 140,
    s = { ...p.settings, minDot: 2 };
  const g = geometry(s, a.width, a.height);
  const height = a.height * g.pitch,
    width = a.width * g.pitch;
  const paperColumn = 55;
  // The two reds have similar Lab values, but each stripe is narrower than a dot.
  a.dotField = {
    width: w,
    height: h,
    assignments: Array.from({ length: w * h }, (_, i) =>
      i % w === paperColumn ? -1 : i % 2,
    ),
  };
  const previous = dotMarks(a, s, g);
  expect(previous).toHaveLength(0);
  const portrait = {
    ...a,
    dotField: {
      ...a.dotField,
      portraitV2: {
        evidence: Array<number>(w * h).fill(0),
        toneArea: a.assignments.map(() => 1),
      },
    },
  };
  const marks = dotMarks(portrait, s, g);
  expect(marks.length).toBeGreaterThan(200);
  expect(dotMarks(portrait, { ...s, dotLayoutVersion: 2 }, g)).toEqual(
    dotMarks(a, { ...s, dotLayoutVersion: 2 }, g),
  );
  for (const [i, mark] of marks.entries()) {
    const centerX = ((mark.x - g.left) / width) * w;
    const centerY = ((mark.y - g.top) / height) * h;
    const radius = (mark.diameter / 2 / width) * w;
    expect(
      centerX + radius <= paperColumn || centerX - radius >= paperColumn + 1,
    ).toBe(true);
    expect((mark.diameter * 25.4) / 72).toBeGreaterThanOrEqual(s.minDot);
    expect((mark.diameter * 25.4) / 72).toBeLessThanOrEqual(s.diameter);
    expect(mark.color).toBe(
      a.dotField.assignments[Math.floor(centerY) * w + Math.floor(centerX)],
    );
    for (const other of marks.slice(i + 1))
      expect(
        Math.hypot(mark.x - other.x, mark.y - other.y) + 1e-8,
      ).toBeGreaterThanOrEqual(
        (1.35 * (mark.footprint + other.footprint)) / 2 + 1.2,
      );
  }
  const restored = JSON.parse(JSON.stringify({ ...p, art: portrait }));
  expect(validateProject(restored)).toBe(true);
  expect(dotMarks(restored.art, s, g)).toEqual(marks);
  const field = portrait.dotField.portraitV2;
  for (const invalid of [
    { ...field, evidence: [0.1] },
    { ...field, evidence: field.evidence.map(() => 1.1) },
    { ...field, toneArea: [1] },
    { ...field, toneArea: field.toneArea.map(() => 2) },
  ])
    expect(
      validateProject({
        ...restored,
        art: {
          ...portrait,
          dotField: { ...portrait.dotField, portraitV2: invalid },
        },
      }),
    ).toBe(false);
});

it("keeps solid facial tones when dots are smaller than the field sample spacing", () => {
  const a = art();
  const g = geometry(settings, a.width, a.height);
  a.dotField = { width: 1, height: 1, assignments: [0] };
  const ordinary = dotMarks(a, settings, g);
  expect(ordinary.length).toBeGreaterThan(0);
  const portrait = {
    ...a,
    dotField: {
      ...a.dotField,
      portraitV2: { evidence: [0], toneArea: a.assignments.map(() => 1) },
    },
  };
  expect(dotMarks(portrait, settings, g)).toEqual(ordinary);
});

it("keeps supported portrait ridges closer without crossing paper or changing saved V2", () => {
  const p = project();
  const art = p.art!;
  const s = { ...p.settings, minDot: 2 };
  const g = geometry(s, art.width, art.height);
  const w = 96;
  const h = 112;
  const width = art.width * g.pitch;
  const ridge = 45;
  const paper = 48;
  const fine = Array.from({ length: w * h }, (_, i) => i % w === ridge);
  const assignments = fine.map((detail, i) =>
    detail ? 0 : i % w === paper ? -1 : 59,
  );
  const portrait = {
    evidence: fine.map((detail, i) => (detail ? 0.7 + (i % 13) / 100 : 0)),
    toneArea: art.assignments.map(() => 1),
  };
  const field = { width: w, height: h, assignments };
  const v2 = { ...art, dotField: { ...field, portraitV2: portrait } };
  const v3 = { ...art, dotField: { ...field, portraitV3: portrait } };
  const previous = dotMarks(v2, s, g);
  // Geometry from the saved V2 packer before V3 and the bucket optimization.
  expect(
    createHash("sha256").update(JSON.stringify(previous)).digest("hex"),
  ).toBe("92465761c0a391bc7122320fb150c763552aa7d8fe1885218b110eb8a8fa4c79");
  const marks = dotMarks(v3, s, g);
  const detail = marks.filter((mark) => mark.color === 0);
  expect(detail.length).toBeGreaterThan(
    previous.filter((mark) => mark.color === 0).length,
  );
  const min = (s.minDot * 72) / 25.4;
  for (const mark of detail) {
    expect(mark.diameter).toBe(min);
    expect(Math.floor(((mark.x - g.left) / width) * w)).toBe(ridge);
  }
  for (const [i, mark] of marks.entries()) {
    const radius = mark.footprint / 2;
    expect(mark.x - radius).toBeGreaterThanOrEqual(g.left);
    expect(mark.x + radius).toBeLessThanOrEqual(g.left + width);
    expect(mark.y - radius).toBeGreaterThanOrEqual(g.top);
    expect(mark.y + radius).toBeLessThanOrEqual(g.top + art.height * g.pitch);
    const paperLeft = g.left + (paper / w) * width;
    const paperRight = paperLeft + width / w;
    expect(
      mark.x + mark.diameter / 2 <= paperLeft ||
        mark.x - mark.diameter / 2 >= paperRight,
    ).toBe(true);
    for (const other of marks.slice(i + 1)) {
      const radii = (mark.footprint + other.footprint) / 2;
      const clearance =
        mark.color === 0 && other.color === 0
          ? radii + (0.45 * 72) / 25.4
          : 1.35 * radii + 1.2;
      expect(
        Math.hypot(mark.x - other.x, mark.y - other.y) + 1e-8,
      ).toBeGreaterThanOrEqual(clearance);
    }
  }
  // Size edits retain IDs: a ridge must never alias a random candidate or
  // another source location when the random-attempt budget changes.
  const ridgeIds = marks.filter(
    (mark) => mark.id >= art.assignments.length + 180000,
  );
  expect(ridgeIds.length).toBeGreaterThan(0);
  const byId = new Map(marks.map((mark) => [mark.id, mark]));
  const resized = dotMarks(v3, { ...s, minDot: 2.25 }, g);
  for (const mark of resized) {
    const original = byId.get(mark.id);
    if (original)
      expect([mark.x, mark.y, mark.cell]).toEqual([
        original.x,
        original.y,
        original.cell,
      ]);
  }
  const restored = JSON.parse(JSON.stringify({ ...p, settings: s, art: v3 }));
  expect(validateProject(restored)).toBe(true);
  expect(dotMarks(restored.art, s, g)).toEqual(marks);
  for (const invalid of [
    { ...portrait, evidence: [null] },
    { ...portrait, evidence: portrait.evidence.map(() => -1) },
    { ...portrait, toneArea: [1] },
    { ...portrait, toneArea: portrait.toneArea.map(() => 2) },
  ]) {
    const invalidArt = { ...v3, dotField: { ...field, portraitV3: invalid } };
    expect(validateProject({ ...restored, art: invalidArt })).toBe(false);
  }
});
