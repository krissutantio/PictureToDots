import { describe, expect, it } from "vitest";
import palette from "../src/palettes.json";
import { processPixels, rgb } from "../src/processing";
import { defaults, type Marker, type Settings } from "../src/types";

const silhouette: Settings = {
  ...defaults,
  priority: "Subject Silhouette",
  smoothing: 0,
};

const pixels = (hex: string[]) =>
  new Uint8ClampedArray(hex.flatMap((color) => [...rgb(color), 255]));

describe("paper tones in Subject Silhouette", () => {
  it("leaves a neutral wall and garment highlights as paper while retaining folds and color", () => {
    const data = pixels([
      "#c1bcb9", // Daylit pale wall.
      "#c1bcb9", // A garment fold with the same measured tone.
      "#dddbdc", // Garment highlight.
      "#eec5a0", // Saturated pale color stays ink.
      "#ffffff", // Uncolored paper or crop margin.
    ]);
    const original = data.slice();
    const art = processPixels(data, 5, 1, silhouette, palette.markers, {
      importance: new Float32Array(5),
      edges: new Float32Array(5),
      protected: new Uint8Array(5),
      strength: 0.7,
      subjectForeground: new Float32Array([0, 1, 1, 0, 0]),
    });

    expect(art.assignments.map((color) => color === -1)).toEqual([
      true,
      false,
      true,
      false,
      true,
    ]);
    expect(data).toEqual(original);
  });

  it("fits the palette to inked areas and honors the paper toggle", () => {
    const markers: Marker[] = [
      { id: "pink", name: "Pink", hex: "#d8b0b8", enabled: true },
      { id: "ink", name: "Ink", hex: "#292631", enabled: true },
      { id: "gray", name: "Gray", hex: "#c1bcb9", enabled: false },
    ];
    const data = pixels([...Array(19).fill("#c1bcb9"), "#292631"]);
    const foreground = new Float32Array(20);
    foreground[19] = 1;
    const settings = { ...silhouette, colors: 1 };
    const process = (s: Settings) =>
      processPixels(data, 20, 1, s, markers, undefined, foreground);

    const paper = process(settings);
    expect(paper.palette.map(({ id }) => id)).toEqual(["ink"]);
    expect(paper.assignments).toEqual([...Array(19).fill(-1), 0]);

    for (const s of [
      { ...settings, white: false },
      { ...settings, priority: "Color Accuracy" as const },
      { ...settings, priority: "Portrait Simplification" as const },
      { ...settings, mode: "lines" as const },
    ]) {
      const art = process(s);
      expect(art.assignments).toEqual(Array(20).fill(0));
      expect(art.palette.map(({ id }) => id)).toEqual(["pink"]);
    }
  });

  it("preserves a small measured gray detail surrounded by paper", () => {
    const markers: Marker[] = [
      { id: "pink", name: "Pink", hex: "#d28b9d", enabled: true },
      { id: "gray", name: "Gray", hex: "#666666", enabled: true },
    ];
    const data = pixels([
      ...Array(4).fill("#eeeeee"),
      "#c1bcb9",
      ...Array(4).fill("#eeeeee"),
    ]);
    const baseline = processPixels(
      data,
      3,
      3,
      { ...silhouette, priority: "Color Accuracy" },
      markers,
    );
    expect(baseline.palette[baseline.assignments[4]]?.id).toBe("pink");
    for (const settings of [
      { ...silhouette, smoothing: 1 },
      { ...silhouette, dither: true },
    ]) {
      const art = processPixels(data, 3, 3, settings, markers);
      expect(art.palette[art.assignments[4]]?.id).toBe("gray");
      expect(art.assignments.filter((color) => color === -1)).toHaveLength(8);
    }
  });
});
