import { describe, it, expect } from "vitest";
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
  settings,
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
    expect(marks.length).toBeLessThan(a.assignments.length);
    expect(new Set(marks.map((m) => m.cell)).size).toBe(marks.length);
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
    const edge = marks.filter((m) => [11, 12].includes(m.cell % 24));
    const flat = marks.filter((m) => [3, 20].includes(m.cell % 24));
    expect(edge.length).toBeGreaterThan(0);
    expect(edge[0].diameter).toBeLessThan(flat[0].diameter);
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
    expect(after).toContain(">BH</text>");
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
    expect(palette.note).toContain("NOT an official");
    const labels = Array.from({ length: 60 }, (_, i) => letter(i));
    expect(labels[25]).toBe("Z");
    expect(labels[26]).toBe("AA");
    expect(labels[59]).toBe("BH");
    expect(new Set(labels).size).toBe(60);
    expect(labels.every((l) => /^[A-Z]{1,2}$/.test(l))).toBe(true);
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
