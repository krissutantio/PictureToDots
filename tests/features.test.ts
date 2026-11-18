import { describe, expect, it } from "vitest";
import {
  cropPoint,
  cropRect,
  legacyFrame,
  rotatePoint,
  unrotatePoint,
  artworkRatio,
} from "../src/crop";
import { importanceMap, featurePrepare } from "../src/features";
import { processPixels } from "../src/processing";
import { defaults, type Project } from "../src/types";
import { validateProject } from "../src/storage";
import palette from "../src/palettes.json";
import type { ImportanceStroke, SubjectAnalysis } from "../src/subject-types";

const frame = { cx: 0.5, cy: 0.5, zoom: 1, allowOutside: true };
const project = (): Project => ({
  version: 1,
  id: "legacy",
  title: "Legacy",
  updated: 0,
  image: "data:image/png;base64,",
  settings: { ...defaults },
  palette,
  edits: {},
});

describe("reversible framing and source coordinates", () => {
  it("pans in both axes at 1× and constrains to the image when margins are disabled", () => {
    const base = cropRect(400, 600, 0.75, frame);
    const moved = cropRect(400, 600, 0.75, { ...frame, cx: 0.6, cy: 0.6 });
    expect(moved.x - base.x).toBeCloseTo(0.1);
    expect(moved.y - base.y).toBeCloseTo(0.1);
    expect(moved.x + moved.width).toBeGreaterThan(1);
    const bounded = cropRect(400, 600, 0.75, {
      ...frame,
      cx: 1.5,
      cy: 1.5,
      allowOutside: false,
    });
    expect(bounded.x + bounded.width).toBeCloseTo(1);
    expect(bounded.y + bounded.height).toBeCloseTo(1);
  });
  it("preserves the legacy crop and rotates source-space strokes into the accepted frame", () => {
    const s = { ...defaults, crop: 2, cropX: 25, cropY: 75 };
    const rect = cropRect(400, 600, artworkRatio(s), legacyFrame(400, 600, s));
    expect(rect.x).toBeCloseTo((1 - rect.width) * 0.25);
    expect(rect.y).toBeCloseTo((1 - rect.height) * 0.75);
    const p = { x: 0.2, y: 0.3 };
    for (const rotation of [0, 90, 180, 270])
      expect(unrotatePoint(rotatePoint(p, rotation), rotation)).toEqual(
        expect.objectContaining({
          x: expect.closeTo(0.2),
          y: expect.closeTo(0.3),
        }),
      );
    const s2 = { ...defaults, priority: "Feature Preservation" as const };
    const crop = { x: 0, y: 0, width: 1, height: 1 };
    const map = importanceMap(
      100,
      100,
      36,
      s2,
      undefined,
      [{ points: [p], radius: 0.035, value: 1 }],
      crop,
      90,
    );
    const target = cropPoint(p, crop, 90);
    expect(
      map.protected[
        Math.floor(target.y * 100) * 100 + Math.floor(target.x * 100)
      ],
    ).toBe(1);
    expect(map.protected[30 * 100 + 20]).toBe(0);
  });
});

describe("feature strategies preserve physical constraints", () => {
  it("keeps grid and enabled ink limits for 4–8 colors and protects measured detail from cleanup", () => {
    const data = new Uint8ClampedArray(48 * 64 * 4).fill(255);
    // A measured small dark detail; no fabricated landmarks.
    for (let y = 25; y < 29; y++)
      for (let x = 20; x < 24; x++)
        data.set([15, 15, 15, 255], (y * 48 + x) * 4);
    for (const colors of [4, 8])
      for (const priority of [
        "Balanced",
        "Feature Preservation",
        "Maximum Recognizability",
      ] as const) {
        const settings = { ...defaults, priority, colors, smoothing: 4 };
        const prepared = featurePrepare(
          data,
          48,
          64,
          12,
          16,
          settings,
          undefined,
          [{ points: [{ x: 0.45, y: 0.42 }], radius: 0.08, value: 1 }],
          { x: 0, y: 0, width: 1, height: 1 },
        );
        const art = processPixels(
          prepared.data,
          12,
          16,
          settings,
          palette.markers,
          prepared.features,
        );
        expect(art.assignments).toHaveLength(192);
        expect(art.palette.length).toBeLessThanOrEqual(colors);
        expect(
          art.palette.every((m) =>
            palette.markers.some((p) => p.enabled && p.id === m.id),
          ),
        ).toBe(true);
        expect(prepared.features.protected.some(Boolean)).toBe(true);
        expect(new Set(art.assignments).size).toBeGreaterThan(1);
      }
  });
});

describe("version-1 backup compatibility", () => {
  it("migrates old feature defaults and retains framing, original bytes and source strokes", () => {
    const p = project();
    for (const key of [
      "priority",
      "featureStrength",
      "backgroundSimplification",
      "edgeEmphasis",
      "localContrast",
      "textureRemoval",
      "facialDetail",
      "minFeatureSize",
      "preserveHair",
      "subjectKind",
    ])
      delete (p.settings as unknown as Record<string, unknown>)[key];
    expect(validateProject(p)).toBe(true);
    expect(p.settings.priority).toBe("Color Accuracy");
    p.framing = frame;
    p.originalFile = { name: "photo.png", type: "image/png", data: p.image };
    p.importanceStrokes = [
      { points: [{ x: 0.3, y: 0.4 }], radius: 0.035, value: 1 },
    ];
    const restored = JSON.parse(JSON.stringify(p));
    expect(validateProject(restored)).toBe(true);
    expect(restored).toEqual(p);
  });
  it("rejects malformed new fields without throwing", () => {
    for (const bad of [
      { framing: null },
      { importanceStrokes: [null] },
      { analysis: { faces: [null] } },
      { originalFile: {} },
      { settings: { ...defaults, rotation: 45 } },
      { settings: { ...defaults, facialDetail: "invalid" } },
    ]) {
      expect(validateProject({ ...project(), ...bad })).toBe(false);
    }
  });
});

it("reserves only measured feature contrast and falls back when no face is detected", () => {
  const width = 64;
  const flat = new Uint8ClampedArray(width * width * 4);
  for (let i = 0; i < flat.length; i += 4) flat.set([180, 140, 120, 255], i);
  const left = { x: 0.35, y: 0.4 },
    right = { x: 0.65, y: 0.4 };
  const box = { x: 0.2, y: 0.15, width: 0.6, height: 0.7 };
  const subject: SubjectAnalysis = {
    width: 1,
    height: 1,
    saliency: [0.5],
    edges: [0],
    box,
    kind: "Portrait",
    method: "face landmarks",
    confidence: 0.6,
    message: "",
    modelStatus: "ready",
    faces: [
      {
        box,
        points: [],
        groups: {
          eyes: [[left], [right]],
          brows: [[left], [right]],
          nose: [{ x: 0.5, y: 0.5 }],
          mouth: [{ x: 0.5, y: 0.65 }],
          oval: [{ x: 0.25, y: 0.6 }],
        },
      },
    ],
  };
  const s = { ...defaults, priority: "Portrait Simplification" as const };
  const rect = { x: 0, y: 0, width: 1, height: 1 };
  const prepare = (
    data: Uint8ClampedArray,
    found = true,
    strokes: ImportanceStroke[] = [],
    rotation = 0,
  ) =>
    featurePrepare(
      data,
      width,
      width,
      16,
      16,
      { ...s, rotation },
      found ? subject : undefined,
      strokes,
      rect,
    );
  expect(prepare(flat).portraitEvidence?.some((v) => v > 0)).toBe(false);
  expect(prepare(flat, false).portraitEvidence).toBeUndefined();
  const withEye = flat.slice();
  const center = 25 * width + 22;
  for (const i of [center - 1, center, center + 1])
    withEye.set([25, 20, 18, 255], i * 4);
  const prepared = prepare(withEye);
  expect(prepared.portraitEvidence?.[center]).toBeGreaterThan(0.22);
  expect(prepared.portraitEvidence?.[25 * width + 42]).toBe(0);
  expect(prepared.detailData[center * 4]).toBe(25);

  const featureTones = flat.slice();
  const sourceDetails = [
    { x: 22, y: 25, tone: [228, 204, 187] }, // visible light gap near the lid
    { x: 32, y: 32, tone: [159, 121, 104] }, // modest nose shadow
    { x: 32, y: 41, tone: [202, 133, 120] }, // red lip detail, similar luminance
  ];
  for (const { x, y, tone } of sourceDetails)
    for (const offset of [-1, 0, 1])
      featureTones.set([...tone, 255], (y * width + x + offset) * 4);
  const detail = prepare(featureTones);
  for (const { x, y } of sourceDetails)
    expect(detail.portraitEvidence?.[y * width + x]).toBeGreaterThan(0.22);
  const ignored = prepare(featureTones, true, [
    { points: [left], radius: 0.085, value: -1 },
  ]);
  expect(ignored.portraitEvidence?.[center]).toBe(0);
  expect(ignored.portraitEvidence?.[32 * width + 32]).toBeGreaterThan(0.22);

  const rotated = flat.slice();
  for (const { x, y, tone } of sourceDetails)
    for (const offset of [-1, 0, 1])
      rotated.set([...tone, 255], ((x + offset) * width + width - 1 - y) * 4);
  const rotatedEvidence = prepare(rotated, true, [], 90).portraitEvidence;
  for (const { x, y } of sourceDetails)
    expect(rotatedEvidence?.[x * width + width - 1 - y]).toBeGreaterThan(0.22);
});
