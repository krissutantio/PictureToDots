import { openDB } from "idb";
import { defaults, type Project } from "./types";
const db = () =>
  openDB("paper-pigment", 1, {
    upgrade(db) {
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("preferences");
    },
  });
export async function saveProject(p: Project) {
  return (await db()).put("projects", p);
}
export async function getProjects(): Promise<Project[]> {
  return (await (await db()).getAll("projects")).sort(
    (a, b) => b.updated - a.updated,
  );
}
export async function deleteProject(id: string) {
  return (await db()).delete("projects", id);
}
export async function savePreference(key: string, value: unknown) {
  return (await db()).put("preferences", value, key);
}
export async function getPreference(key: string) {
  return (await db()).get("preferences", key);
}
export function validateProject(p: unknown): p is Project {
  // Malformed nested JSON must be rejected without crashing the import UI.
  try {
    return validateProjectData(p);
  } catch {
    return false;
  }
}
function validateProjectData(p: unknown): p is Project {
  const x = p as Project;
  if (
    !x ||
    x.version !== 1 ||
    typeof x.id !== "string" ||
    typeof x.title !== "string" ||
    x.title.length > 500 ||
    typeof x.image !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(x.image) ||
    !x.settings ||
    !["dots", "lines"].includes(x.settings.mode) ||
    !x.palette ||
    !Array.isArray(x.palette.markers) ||
    x.palette.markers.length < 1 ||
    x.palette.markers.length > 100
  )
    return false;
  const validMarker = (m: Project["palette"]["markers"][number]) =>
    m &&
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    /^#[a-f0-9]{6}$/i.test(m.hex) &&
    typeof m.enabled === "boolean";
  if (!x.palette.markers.every(validMarker)) return false;
  const limits: Record<string, [number, number]> = {
    columns: [12, 100],
    colors: [1, 60],
    lineDetail: [48, 160],
    minRegion: [1, 1000],
    regionMm2: [1, 60],
    edgePreservation: [10, 95],
    simplification: [0, 1],
    smoothing: [0, 4],
    thickness: [0.1, 5],
    brightness: [-100, 100],
    contrast: [0.1, 3],
    saturation: [0, 3],
    rotation: [0, 270],
    crop: [1, 3],
    cropX: [0, 100],
    cropY: [0, 100],
    width: [3, 12],
    height: [3, 17],
    margin: [0.15, 0.6],
    binding: [0.3, 0.9],
    bleed: [0, 0.125],
    diameter: [0.5, 5],
    minDot: [0.5, 5],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    const v = (x.settings as unknown as Record<string, unknown>)[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      return false;
  }
  const validArt = (a: NonNullable<Project["art"]>) => {
    if (
      !a ||
      !["dots", "lines"].includes(a.mode) ||
      !Number.isInteger(a.width) ||
      a.width < 1 ||
      a.width > 200 ||
      !Number.isInteger(a.height) ||
      a.height < 1 ||
      a.height > 2000 ||
      !Array.isArray(a.palette) ||
      a.palette.length > 60 ||
      !a.palette.length ||
      !a.palette.every(validMarker) ||
      !Array.isArray(a.assignments) ||
      a.assignments.length !== a.width * a.height
    )
      return false;
    const validColor = (v: number) =>
      Number.isInteger(v) && v >= -1 && v < a.palette.length;
    if (
      !a.assignments.every(validColor) ||
      !Array.isArray(a.regions) ||
      a.regions.length > a.assignments.length
    )
      return false;
    if (a.dotField !== undefined) {
      const f = a.dotField;
      if (
        !f ||
        !Number.isInteger(f.width) ||
        !Number.isInteger(f.height) ||
        f.width < 1 ||
        f.height < 1 ||
        f.width > 2048 ||
        f.height > 2048 ||
        f.width * f.height > 800000 ||
        !Array.isArray(f.assignments) ||
        f.assignments.length !== f.width * f.height ||
        !f.assignments.every(validColor) ||
        (f.importance !== undefined &&
          (!Array.isArray(f.importance) ||
            f.importance.length !== f.assignments.length ||
            !f.importance.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)))
      )
        return false;
    }
    if (a.diagnostics !== undefined) {
      const d = a.diagnostics;
      if (
        !d ||
        ![d.importance, d.edges].every(
          (map) =>
            Array.isArray(map) &&
            map.length === a.assignments.length &&
            map.every((v) => Number.isFinite(v) && v >= 0 && v <= 1),
        ) ||
        !d.metrics ||
        !Array.isArray(d.metrics.warnings) ||
        !d.metrics.warnings.every((w) => typeof w === "string") ||
        ![
          d.metrics.sourceEdgeContrast,
          d.metrics.outputEdgeContrast,
          d.metrics.edgeAlignment,
          d.metrics.protectedCells,
          d.metrics.regions,
          d.metrics.faceSamples,
        ].every(Number.isFinite)
      )
        return false;
    }
    return a.regions.every(
      (r) =>
        Number.isInteger(r.id) &&
        validColor(r.color) &&
        Array.isArray(r.cells) &&
        r.cells.every(
          (i) => Number.isInteger(i) && i >= 0 && i < a.assignments.length,
        ) &&
        Array.isArray(r.paths) &&
        r.paths.every(
          (path) => typeof path === "string" && /^[MLZ0-9. ,\-]+$/.test(path),
        ) &&
        Array.isArray(r.label) &&
        r.label.length === 2 &&
        r.label.every(Number.isFinite) &&
        Number.isFinite(r.clearance),
    );
  };
  if (x.art && (x.art.mode !== x.settings.mode || !validArt(x.art)))
    return false;
  if (
    !x.edits ||
    !Object.entries(x.edits).every(
      ([k, v]) =>
        /^\d+$/.test(k) &&
        Number.isInteger(v) &&
        v >= -1 &&
        v < (x.art?.palette.length || 60),
    )
  )
    return false;
  const featureNumbers: Record<string, [number, number]> = {
    featureStrength: [0, 100],
    backgroundSimplification: [0, 100],
    edgeEmphasis: [0, 100],
    localContrast: [0, 100],
    textureRemoval: [0, 100],
    minFeatureSize: [0.5, 3],
  };
  for (const [key, [min, max]] of Object.entries(featureNumbers)) {
    const value = (x.settings as unknown as Record<string, unknown>)[key];
    if (
      value !== undefined &&
      (typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max)
    )
      return false;
  }
  if (
    x.settings.priority !== undefined &&
    ![
      "Color Accuracy",
      "Balanced",
      "Feature Preservation",
      "Maximum Recognizability",
    ].includes(x.settings.priority)
  )
    return false;
  for (const [key, values] of Object.entries({
    dotLayout: ["regular", "adaptive"],
    facialDetail: ["Low", "Medium", "High"],
    subjectKind: [
      "Auto",
      "Portrait",
      "Animal",
      "Flower / plant",
      "Building",
      "Landscape",
      "General object",
    ],
  })) {
    const value = (x.settings as unknown as Record<string, unknown>)[key];
    if (value !== undefined && !values.includes(value as string)) return false;
  }
  if (
    x.settings.preserveHair !== undefined &&
    typeof x.settings.preserveHair !== "boolean"
  )
    return false;
  if (x.cropReview !== undefined && typeof x.cropReview !== "boolean")
    return false;
  if (x.settings.rotation % 90 !== 0) return false;
  if (
    x.framing !== undefined &&
    (![x.framing.cx, x.framing.cy, x.framing.zoom].every(Number.isFinite) ||
      x.framing.cx < -0.5 ||
      x.framing.cx > 1.5 ||
      x.framing.cy < -0.5 ||
      x.framing.cy > 1.5 ||
      x.framing.zoom < 0.5 ||
      x.framing.zoom > 8 ||
      typeof x.framing.allowOutside !== "boolean")
  )
    return false;
  const point = (p: { x: number; y: number }) =>
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= -0.5 &&
    p.x <= 1.5 &&
    p.y >= -0.5 &&
    p.y <= 1.5;
  if (
    x.importanceStrokes !== undefined &&
    (!Array.isArray(x.importanceStrokes) ||
      x.importanceStrokes.length > 500 ||
      !x.importanceStrokes.every(
        (stroke) =>
          Array.isArray(stroke.points) &&
          stroke.points.length > 0 &&
          stroke.points.length <= 5000 &&
          stroke.points.every(point) &&
          Number.isFinite(stroke.radius) &&
          stroke.radius >= 0.005 &&
          stroke.radius <= 0.2 &&
          [1, -1].includes(stroke.value),
      ))
  )
    return false;
  if (x.analysis !== undefined) {
    const a = x.analysis;
    const box = (b: { x: number; y: number; width: number; height: number }) =>
      b &&
      point(b) &&
      Number.isFinite(b.width) &&
      Number.isFinite(b.height) &&
      b.width > 0 &&
      b.width < 3 &&
      b.height > 0 &&
      b.height < 3;
    if (
      !Number.isInteger(a.width) ||
      !Number.isInteger(a.height) ||
      a.width < 1 ||
      a.height < 1 ||
      a.width > 512 ||
      a.height > 512 ||
      !box(a.box) ||
      !Number.isFinite(a.confidence) ||
      a.confidence < 0 ||
      a.confidence > 1 ||
      ![
        "Auto",
        "Portrait",
        "Animal",
        "Flower / plant",
        "Building",
        "Landscape",
        "General object",
      ].includes(a.kind) ||
      ![
        "face landmarks",
        "object detector",
        "image classifier + saliency",
        "generic saliency",
      ].includes(a.method) ||
      !["ready", "fallback"].includes(a.modelStatus) ||
      typeof a.message !== "string" ||
      !Array.isArray(a.saliency) ||
      !Array.isArray(a.edges) ||
      a.saliency.length !== a.width * a.height ||
      a.edges.length !== a.saliency.length ||
      ![...a.saliency, ...a.edges].every(
        (v) => Number.isFinite(v) && v >= 0 && v <= 1,
      ) ||
      !Array.isArray(a.faces) ||
      a.faces.length > 5
    )
      return false;
    for (const f of a.faces) {
      if (
        !box(f.box) ||
        !Array.isArray(f.points) ||
        f.points.length > 500 ||
        !f.points.every(point) ||
        !f.groups ||
        !Array.isArray(f.groups.eyes) ||
        f.groups.eyes.length !== 2 ||
        !Array.isArray(f.groups.brows) ||
        f.groups.brows.length !== 2
      )
        return false;
      for (const group of [
        ...f.groups.eyes,
        ...f.groups.brows,
        f.groups.nose,
        f.groups.mouth,
        f.groups.oval,
      ])
        if (
          !Array.isArray(group) ||
          !group.length ||
          group.length > 500 ||
          !group.every(point)
        )
          return false;
    }
  }
  if (
    x.originalFile !== undefined &&
    (typeof x.originalFile.name !== "string" ||
      typeof x.originalFile.type !== "string" ||
      typeof x.originalFile.data !== "string" ||
      !/^data:image\/(png|jpeg|webp);base64,/.test(x.originalFile.data))
  )
    return false;
  if (
    x.settings.dotLayoutVersion !== undefined &&
    ![1, 2].includes(x.settings.dotLayoutVersion)
  )
    return false;
  const dotLayoutVersion =
    x.settings.dotLayoutVersion ??
    (x.settings.dotLayout === "adaptive" ? 1 : 2);
  x.settings = { ...defaults, ...x.settings, dotLayoutVersion };
  // Cached modes are an optimization, not trusted import input.
  delete x.variants;
  return true;
}
