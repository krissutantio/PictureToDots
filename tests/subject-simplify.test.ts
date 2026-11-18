import { describe, expect, it } from "vitest";
import { simplifySubject } from "../src/subject-simplify";
import type { Box, FeatureData, SubjectAnalysis } from "../src/subject-types";
import { defaults, type Settings } from "../src/types";

const settings: Settings = { ...defaults, priority: "Subject Silhouette" };
const fullCrop = { x: 0, y: 0, width: 1, height: 1 };
const map = (size: number): FeatureData => ({
  importance: new Float32Array(size),
  edges: new Float32Array(size),
  protected: new Uint8Array(size),
  strength: 0.7,
});
const image = (
  w: number,
  h: number,
  color: (x: number, y: number) => number[],
) =>
  new Uint8ClampedArray(
    Array.from({ length: w * h }, (_, i) => [
      ...color(i % w, Math.floor(i / w)),
      255,
    ]).flat(),
  );
const pixel = (data: Uint8ClampedArray, w: number, x: number, y: number) => [
  ...data.slice((y * w + x) * 4, (y * w + x) * 4 + 3),
];

describe("subject preparation", () => {
  it("quiets connected neutral background while retaining enclosed and protected pale tones", () => {
    const w = 7,
      h = 7;
    const wall = [165, 154, 119],
      cloth = [195, 190, 188],
      boundary = [38, 32, 37];
    const data = image(w, h, (x, y) => {
      if (y === 0 && x < 2) return cloth;
      if (x === 3 && y === 3) return cloth;
      if (x >= 2 && x <= 4 && y >= 2 && y <= 4) return boundary;
      return wall;
    });
    const original = data.slice();
    const features = map(w * h);
    features.protected[0] = 1;
    features.importance[1] = 0.95;
    const result = simplifySubject(
      data,
      w,
      h,
      settings,
      undefined,
      fullCrop,
      features,
    );

    expect(pixel(result.data, w, 0, 4)).toEqual([255, 255, 255]);
    expect(pixel(result.data, w, 1, 5)).toEqual([255, 255, 255]);
    expect(pixel(result.data, w, 1, 3)).toEqual(wall);
    expect(pixel(result.data, w, 2, 3)).toEqual(boundary);
    expect(pixel(result.data, w, 3, 3)).toEqual(cloth);
    expect(pixel(result.data, w, 0, 0)).toEqual(cloth);
    expect(pixel(result.data, w, 1, 0)).toEqual(cloth);
    expect(result.foreground[3 * w + 3]).toBeGreaterThan(
      result.foreground[4 * w],
    );
    expect(data).toEqual(original);
  });

  it("preserves the observed background when paper is disabled", () => {
    const data = image(4, 4, () => [195, 190, 188]);
    const result = simplifySubject(
      data,
      4,
      4,
      { ...settings, white: false },
      undefined,
      fullCrop,
      map(16),
    );
    expect(result.data).toEqual(data);
  });

  it("flattens measured skin tones within a rotated and cropped face while preserving dark detail", () => {
    const w = 12,
      h = 12;
    const box: Box = { x: 0.125, y: 0.125, width: 0.25, height: 0.25 };
    const crop: Box = { x: 0.375, y: 0, width: 0.5, height: 0.5 };
    const analysis: SubjectAnalysis = {
      width: w,
      height: h,
      saliency: [],
      edges: [],
      box,
      faces: [
        {
          box,
          points: [],
          groups: { eyes: [], brows: [], nose: [], mouth: [], oval: [] },
        },
      ],
      kind: "Portrait",
      method: "face landmarks",
      confidence: 0.6,
      message: "",
      modelStatus: "ready",
    };
    const dark = [35, 26, 29],
      low = [178, 124, 105],
      middle = [183, 128, 108],
      high = [193, 136, 114];
    const shades = [low, middle, high];
    const data = image(w, h, (x, y) =>
      x === 8 && y === 5 ? dark : shades[x % 3],
    );
    const original = data.slice();
    const result = simplifySubject(
      data,
      w,
      h,
      { ...settings, rotation: 90 },
      analysis,
      crop,
      map(w * h),
    );

    expect(pixel(result.data, w, 6, 4)).toEqual(middle);
    expect(pixel(result.data, w, 8, 4)).toEqual(middle);
    expect(pixel(result.data, w, 8, 5)).toEqual(dark);
    expect(pixel(result.data, w, 3, 4)).toEqual(low);
    expect(pixel(result.data, w, 6, 2)).toEqual(low);
    expect(data).toEqual(original);
  });
});
