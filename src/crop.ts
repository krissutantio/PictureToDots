import type { Box, Point, CropFrame, SubjectAnalysis } from "./subject-types";
import type { Settings } from "./types";
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const artworkRatio = (s: Settings) =>
  (s.width - 2 * s.margin) / (s.height - s.binding - 2 * s.margin - 0.7);
export function rotatePoint(p: Point, rotation: number): Point {
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return { x: 1 - p.y, y: p.x };
    case 180:
      return { x: 1 - p.x, y: 1 - p.y };
    case 270:
      return { x: p.y, y: 1 - p.x };
    default:
      return p;
  }
}
export function unrotatePoint(p: Point, rotation: number) {
  return rotatePoint(p, 360 - rotation);
}
export function rotateBox(b: Box, rotation: number): Box {
  const points = [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x, y: b.y + b.height },
    { x: b.x + b.width, y: b.y + b.height },
  ].map((p) => rotatePoint(p, rotation));
  const x = Math.min(...points.map((p) => p.x)),
    y = Math.min(...points.map((p) => p.y));
  return {
    x,
    y,
    width: Math.max(...points.map((p) => p.x)) - x,
    height: Math.max(...points.map((p) => p.y)) - y,
  };
}
export function cropRect(
  imageWidth: number,
  imageHeight: number,
  ratio: number,
  frame: CropFrame,
): Box {
  const w =
      (imageWidth / imageHeight > ratio ? imageHeight * ratio : imageWidth) /
      clamp(frame.zoom, 0.5, 8),
    h = w / ratio;
  let x = frame.cx * imageWidth - w / 2,
    y = frame.cy * imageHeight - h / 2;
  if (!frame.allowOutside) {
    x = clamp(x, 0, Math.max(0, imageWidth - w));
    y = clamp(y, 0, Math.max(0, imageHeight - h));
  }
  return {
    x: x / imageWidth,
    y: y / imageHeight,
    width: w / imageWidth,
    height: h / imageHeight,
  };
}
export function legacyFrame(w: number, h: number, s: Settings): CropFrame {
  const rect = cropRect(w, h, artworkRatio(s), {
    cx: 0.5,
    cy: 0.5,
    zoom: s.crop,
    allowOutside: false,
  });
  return {
    cx: ((1 - rect.width) * s.cropX) / 100 + rect.width / 2,
    cy: ((1 - rect.height) * s.cropY) / 100 + rect.height / 2,
    zoom: s.crop,
    allowOutside: true,
  };
}
export function suggestCrop(
  a: SubjectAnalysis,
  imageWidth: number,
  imageHeight: number,
  ratio: number,
  rotation = 0,
): { frame: CropFrame; reason: string; retention: number } {
  const quarter = rotation % 180 !== 0,
    w = quarter ? imageHeight : imageWidth,
    h = quarter ? imageWidth : imageHeight;
  const subject = rotateBox(a.box, rotation);
  const face = a.faces.length > 0;
  const padX = subject.width * (face ? 0.24 : 0.12),
    padTop = subject.height * (face ? 0.38 : 0.15),
    padBottom = subject.height * (face ? 0.2 : 0.15);
  const box = {
    x: clamp(subject.x - padX),
    y: clamp(subject.y - padTop),
    width: 0,
    height: 0,
  };
  box.width = clamp(subject.x + subject.width + padX) - box.x;
  box.height = clamp(subject.y + subject.height + padBottom) - box.y;
  const base = cropRect(w, h, ratio, {
    cx: 0.5,
    cy: 0.5,
    zoom: 1,
    allowOutside: false,
  });
  let zoom = clamp(
    Math.min(
      base.width / Math.max(0.05, box.width),
      base.height / Math.max(0.05, box.height),
    ),
    1,
    5,
  );
  if (a.kind === "Landscape" || a.confidence < 0.2) zoom = 1;
  const cw = base.width / zoom,
    ch = base.height / zoom;
  const frame = {
    cx: clamp(box.x + box.width / 2, cw / 2, 1 - cw / 2),
    cy: clamp(box.y + box.height / 2, ch / 2, 1 - ch / 2),
    zoom,
    allowOutside: true,
  };
  const rect = cropRect(w, h, ratio, frame);
  const intersection =
    Math.max(
      0,
      Math.min(rect.x + rect.width, subject.x + subject.width) -
        Math.max(rect.x, subject.x),
    ) *
    Math.max(
      0,
      Math.min(rect.y + rect.height, subject.y + subject.height) -
        Math.max(rect.y, subject.y),
    );
  return {
    frame,
    retention: intersection / Math.max(0.0001, subject.width * subject.height),
    reason: face
      ? `Frames ${a.faces.length === 1 ? "the detected face" : "all " + a.faces.length + " detected faces"} with room around the silhouette. Review hair, ears and expression before accepting.`
      : a.kind === "Landscape"
        ? "Keeps the wider scene and its major structural boundaries."
        : "Centers the strongest detected subject area. This is a suggestion, not guaranteed subject recognition.",
  };
}
export function cropPoint(p: Point, rect: Box, rotation: number) {
  const r = rotatePoint(p, rotation);
  return { x: (r.x - rect.x) / rect.width, y: (r.y - rect.y) / rect.height };
}
