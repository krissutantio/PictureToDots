export type Point = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number };
export type SubjectKind =
  | "Auto"
  | "Portrait"
  | "Animal"
  | "Flower / plant"
  | "Building"
  | "Landscape"
  | "General object";
export type Face = {
  box: Box;
  points: Point[];
  groups: {
    eyes: Point[][];
    brows: Point[][];
    nose: Point[];
    mouth: Point[];
    oval: Point[];
  };
};
export type SubjectAnalysis = {
  width: number;
  height: number;
  saliency: number[];
  edges: number[];
  box: Box;
  faces: Face[];
  kind: SubjectKind;
  method:
    | "face landmarks"
    | "object detector"
    | "image classifier + saliency"
    | "generic saliency";
  confidence: number;
  message: string;
  modelStatus: "ready" | "fallback";
};
export type ImportanceStroke = {
  points: Point[];
  radius: number;
  value: 1 | -1;
};
export type CropFrame = {
  cx: number;
  cy: number;
  zoom: number;
  allowOutside: boolean;
};
export type FeatureMetrics = {
  sourceEdgeContrast: number;
  outputEdgeContrast: number;
  edgeAlignment: number;
  protectedCells: number;
  regions: number;
  warnings: string[];
  eyeSeparationCells?: number;
  faceSamples: number;
};
export type FeatureData = {
  importance: Float32Array;
  edges: Float32Array;
  protected: Uint8Array;
  strength: number;
};
