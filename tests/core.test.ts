import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  lab,
  distance,
  selectPalette,
  processPixels,
  regionsFor,
  geometry,
  printWarnings,
  simplifyRegions,
} from "../src/processing";
import {
  artworkPDF,
  keyPDF,
  calibrationPDF,
  protectivePDF,
} from "../src/export";
import { artworkSVG } from "../src/render";
import { defaults, type Project } from "../src/types";
import { validateProject } from "../src/storage";
import palette from "../src/palettes.json";
const pixels = (w = 12, h = 16) =>
  new Uint8ClampedArray(
    Array.from({ length: w * h }, (_, i) =>
      i % w < w / 2 ? [39, 84, 71, 255] : [239, 209, 107, 255],
    ).flat(),
  );
const project = (mode: "dots" | "lines" = "dots"): Project => ({
  version: 1,
  id: "test",
  title: "Test page",
  image: "data:image/png;base64,",
  settings: { ...defaults, mode },
  palette: { ...palette, paper: "Test" },
  edits: {},
  updated: 0,
  art: processPixels(pixels(), 12, 16, { ...defaults, mode }, palette.markers),
});
describe("perceptual matching and segmentation", () => {
  it("has standard CIELAB white and black values", () => {
    expect(lab([255, 255, 255])[0]).toBeCloseTo(100, 2);
    expect(lab([0, 0, 0])).toEqual([0, 0, 0]);
    expect(distance(lab([1, 2, 3]), lab([1, 2, 3]))).toBe(0);
  });
  it("selects a global subset", () => {
    expect(
      selectPalette(
        [lab([39, 84, 71]), lab([239, 209, 107])],
        palette.markers,
        2,
      ),
    ).toHaveLength(2);
    expect(() => selectPalette([[0, 0, 0]], [], 3)).toThrow("Enable");
  });
  it("rejects invalid palette data safely", () => {
    expect(() =>
      selectPalette(
        [[0, 0, 0]],
        [{ id: "x", name: "bad", hex: "bad", enabled: true }],
        4,
      ),
    ).toThrow();
  });
  it("every assigned dot maps to a valid ink", () => {
    const a = project().art!;
    expect(a.assignments).toHaveLength(192);
    expect(a.assignments.every((n) => n >= 0 && n < a.palette.length)).toBe(
      true,
    );
  });
  it("difficulty changes color count independently of dot count", () => {
    const a = processPixels(
        pixels(),
        12,
        16,
        { ...defaults, colors: 3 },
        palette.markers,
      ),
      b = processPixels(
        pixels(),
        12,
        16,
        { ...defaults, colors: 10 },
        palette.markers,
      );
    expect(a.assignments.length).toBe(b.assignments.length);
    expect(a.palette.length).toBeLessThanOrEqual(3);
  });
  it("line art produces coherent enclosed regions, not edges alone", () => {
    const a = project("lines").art!;
    expect(a.regions.length).toBe(2);
    expect(a.regions.every((r) => r.paths.every((p) => p.endsWith("Z")))).toBe(
      true,
    );
    expect(a.regions.reduce((n, r) => n + r.cells.length, 0)).toBe(192);
  });
  it("merges a tiny isolated region", () => {
    const data = pixels();
    data.set([240, 0, 0, 255], (8 * 12 + 3) * 4);
    const a = processPixels(
      data,
      12,
      16,
      { ...defaults, mode: "lines", minRegion: 10 },
      palette.markers,
    );
    expect(a.regions.every((r) => r.cells.length >= 10)).toBe(true);
  });
  it("puts region labels inside their component", () => {
    const a = project("lines").art!;
    for (const r of a.regions) {
      const i = Math.floor(r.label[1]) * a.width + Math.floor(r.label[0]);
      expect(r.cells).toContain(i);
      expect(r.clearance).toBeGreaterThan(0);
    }
  });
  it("traces holes separately", () => {
    const a = regionsFor([0, 0, 0, 0, 1, 0, 0, 0, 0], 3, 3);
    expect(a[0].paths.length).toBe(2);
  });
  it("supports white uncolored paper", () => {
    const a = processPixels(
      new Uint8ClampedArray(16).fill(255),
      2,
      2,
      defaults,
      palette.markers,
    );
    expect(a.assignments).toEqual([-1, -1, -1, -1]);
  });
});
describe("print layouts and PDF export", () => {
  it("keeps circles separated and printable", () => {
    const g = geometry(defaults, 36, 46);
    expect(g.diameter).toBeLessThan(g.pitch);
    expect(g.font).toBeGreaterThanOrEqual(3);
    expect(g.width).toBe(360);
    expect(g.height).toBe(504);
  });
  it("flags unusable high-density text", () => {
    const p = project();
    p.art!.width = 100;
    p.art!.height = 150;
    expect(printWarnings(p.settings, p.art!).length).toBeGreaterThan(0);
  });
  it("traditional line art omits region labels", () => {
    const p = project("lines");
    p.settings.lineLabels = false;
    const svg = artworkSVG(p);
    expect(svg).not.toContain(
      'text-anchor="middle" font-size="5" fill="#72786f"',
    );
  });
  it("escapes source titles", () => {
    const p = project();
    p.title = "<script>alert(1)</script>";
    expect(artworkSVG(p)).not.toContain("<script>");
  });
  it("exports exact physical sizes and preserves page order", async () => {
    const a = project(),
      b = project("lines");
    b.settings.width = 6;
    const bytes = await artworkPDF([a, b]);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 360, height: 504 });
    expect(pdf.getPage(1).getWidth()).toBe(432);
  });
  it("records bleed and trim dimensions", async () => {
    const p = project();
    p.settings.bleed = 0.125;
    const pdf = await PDFDocument.load(await artworkPDF([p]));
    expect(pdf.getPage(0).getWidth()).toBe(378);
    expect(pdf.getPage(0).getTrimBox()).toEqual({
      x: 9,
      y: 9,
      width: 360,
      height: 504,
    });
  });
  it("generates keys, calibration, and protective inserts", async () => {
    const p = project();
    for (const bytes of [
      await keyPDF([p]),
      await calibrationPDF(p.palette),
      await protectivePDF(p),
    ]) {
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBeGreaterThan(0);
    }
  });
});

it("simplified neighboring contours share identical edges without gaps", () => {
  const w = 12,
    h = 16,
    a = project("lines").art!;
  const regions = simplifyRegions(regionsFor(a.assignments, w, h), w, h);
  const edges = new Map<string, number>();
  for (const r of regions)
    for (const path of r.paths) {
      const n = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number),
        points = Array.from({ length: n.length / 2 }, (_, i) =>
          n.slice(i * 2, i * 2 + 2),
        );
      for (let i = 0; i < points.length; i++) {
        const p = points[i],
          q = points[(i + 1) % points.length];
        if (
          (p[0] === q[0] && (p[0] === 0 || p[0] === w)) ||
          (p[1] === q[1] && (p[1] === 0 || p[1] === h))
        )
          continue;
        const key = [p.join(","), q.join(",")].sort().join("|");
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    }
  expect([...edges.values()].every((n) => n === 2)).toBe(true);
});

it("rejects unsafe imported paths and out-of-range settings", () => {
  const p = project();
  expect(validateProject(p)).toBe(true);
  p.settings.lineDetail = Infinity;
  expect(validateProject(p)).toBe(false);
  const q = project("lines");
  q.art!.regions[0].paths = ['M0 0"/><script>bad</script>'];
  expect(validateProject(q)).toBe(false);
});
