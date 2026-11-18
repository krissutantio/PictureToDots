import type {
  CropFrame,
  SubjectAnalysis,
  ImportanceStroke,
  SubjectKind,
  FeatureMetrics,
} from "./subject-types";
export type Marker = {
  id: string;
  name: string;
  hex: string;
  code?: string;
  symbol?: string;
  enabled: boolean;
};
export type Palette = {
  name: string;
  verified: boolean;
  paper: string;
  markers: Marker[];
};
export type Settings = {
  mode: "dots" | "lines";
  difficulty: string;
  colors: number;
  columns: number;
  stagger: boolean;
  dotLayout: "regular" | "adaptive";
  dotLayoutVersion: 1 | 2 | 3;
  diameter: number;
  minDot: number;
  labels: boolean;
  lineLabels: boolean;
  lineDetail: number;
  minRegion: number;
  regionMm2: number;
  edgePreservation: number;
  simplification: number;
  background: "keep" | "simplify" | "remove";
  smoothing: number;
  thickness: number;
  brightness: number;
  contrast: number;
  saturation: number;
  dither: boolean;
  white: boolean;
  rotation: number;
  crop: number;
  cropX: number;
  cropY: number;
  width: number;
  height: number;
  margin: number;
  binding: number;
  bleed: number;
  guide: "letters" | "circles";
  tip: string;
  priority:
    | "Color Accuracy"
    | "Balanced"
    | "Feature Preservation"
    | "Maximum Recognizability"
    | "Portrait Simplification";
  featureStrength: number;
  backgroundSimplification: number;
  edgeEmphasis: number;
  localContrast: number;
  textureRemoval: number;
  facialDetail: "Low" | "Medium" | "High";
  minFeatureSize: number;
  preserveHair: boolean;
  subjectKind: SubjectKind;
};
export type Region = {
  id: number;
  color: number;
  cells: number[];
  paths: string[];
  label: [number, number];
  clearance: number;
};
export type Artwork = {
  width: number;
  height: number;
  assignments: number[];
  palette: Marker[];
  regions: Region[];
  mode: "dots" | "lines";
  dotField?: {
    width: number;
    height: number;
    assignments: number[];
    importance?: number[];
    portraitV1?: number[];
    portraitV2?: { evidence: number[]; toneArea: number[] };
    portraitV3?: { evidence: number[]; toneArea: number[] };
  };
  diagnostics?: {
    importance: number[];
    edges: number[];
    metrics: FeatureMetrics;
  };
};
export type Project = {
  version: 1;
  id: string;
  title: string;
  image: string;
  originalFile?: { name: string; type: string; data: string };
  framing?: CropFrame;
  analysis?: SubjectAnalysis;
  importanceStrokes?: ImportanceStroke[];
  cropReview?: boolean;
  settings: Settings;
  palette: Palette;
  art?: Artwork;
  variants?: Partial<
    Record<
      "dots" | "lines",
      { key: string; art: Artwork; edits: Record<number, number> }
    >
  >;
  edits: Record<number, number>;
  updated: number;
};
export type Notebook = {
  title: string;
  pages: Project[];
  numbering: boolean;
  protective: "removable" | "bound";
  paperGsm: number;
  boardMm: number;
  quantity: number;
  paperCost: number;
  coverCost: number;
  boardCost: number;
  plasticCost: number;
  bindingCost: number;
  laborCost: number;
};
export const defaults: Settings = {
  mode: "dots",
  difficulty: "Easy",
  colors: 60,
  columns: 36,
  stagger: true,
  dotLayout: "adaptive",
  dotLayoutVersion: 3,
  diameter: 3.2,
  minDot: 2,
  labels: true,
  lineLabels: true,
  lineDetail: 96,
  minRegion: 22,
  regionMm2: 9,
  edgePreservation: 60,
  simplification: 0.65,
  background: "keep",
  smoothing: 2,
  thickness: 0.7,
  brightness: 0,
  contrast: 1,
  saturation: 1,
  dither: false,
  white: true,
  rotation: 0,
  crop: 1,
  cropX: 50,
  cropY: 50,
  width: 5,
  height: 7,
  margin: 0.25,
  binding: 0.6,
  bleed: 0,
  guide: "letters",
  tip: "Fine tip",
  priority: "Color Accuracy",
  featureStrength: 70,
  backgroundSimplification: 55,
  edgeEmphasis: 45,
  localContrast: 45,
  textureRemoval: 65,
  facialDetail: "High",
  minFeatureSize: 1.2,
  preserveHair: true,
  subjectKind: "Auto",
};
export const difficulty: Record<
  string,
  { colors: number; minRegion: number; smoothing: number }
> = {
  Beginner: { colors: 4, minRegion: 55, smoothing: 3 },
  Easy: { colors: 6, minRegion: 30, smoothing: 2 },
  Intermediate: { colors: 9, minRegion: 18, smoothing: 2 },
  Advanced: { colors: 12, minRegion: 10, smoothing: 1 },
  Expert: { colors: 18, minRegion: 5, smoothing: 1 },
};
export function letter(n: number): string {
  let value = "";
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26))
    value = String.fromCharCode(65 + ((i - 1) % 26)) + value;
  return value;
}

export type NotebookEntry = { id: string; updated: number; notebook: Notebook };
