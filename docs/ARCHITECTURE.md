# Architecture map

## Entry points

| Concern                             | Files                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| React studio/navigation/state       | `src/main.tsx`, `src/types.ts`                                                 |
| Crop geometry and editor            | `src/crop.ts`, `src/CropEditor.tsx`                                            |
| Source sampling/original retention  | `src/input.ts`, `src/samples.ts`                                               |
| Subject orchestration               | `src/analysis.ts`, `src/analysis.worker.ts`, `src/saliency.ts`                 |
| Local model inference               | `public/vision/model-worker.js`, model files in the same folder                |
| Feature importance/preprocessing    | `src/features.ts`, `src/ImportanceEditor.tsx`, `src/subject-types.ts`          |
| Palette/segmentation/print geometry | `src/processing.ts`, `src/processor.worker.ts`                                 |
| Strategy comparison                 | `src/StrategyComparison.tsx`                                                   |
| Rendering/downloads                 | `src/render.ts`, `src/export.ts`                                               |
| Persistence/import validation       | `src/storage.ts`                                                               |
| Deployment/offline                  | `vite.config.ts`, `scripts/service-worker.mjs`, `.github/workflows/deploy.yml` |

## Coordinate contracts

- Detected boxes, facial points and importance brush points use normalized **unrotated source** coordinates (0–1). Never store these in preview CSS pixels.
- `Project.framing` uses center/zoom in the **rotated source** coordinate system. `cropRect` returns normalized crop dimensions; white-margin framing may extend outside 0–1.
- `cropPoint` rotates a source point, then maps it into the accepted crop. `unrotatePoint` reverses that mapping for importance sampling.
- `Settings.crop/cropX/cropY` are legacy fields. `legacyFrame` preserves old saved projects; new UI uses `framing`.
- Print geometry is points (72/inch). Dot grid geometry remains regular; feature preservation changes sample/color decisions, never moves dots.

## Data flow

Upload → retain original bytes + normalized local image → subject analysis → suggested crop review → prepareInput (rotation/crop, baseline grid and higher-resolution buffers) → processing worker → SVG/PDF/export.

Color Accuracy uses the existing baseline pipeline. Other priorities preprocess higher-resolution pixels before reduction, compute importance/edge maps, weight palette selection and structural luminance decisions, and protect critical measured regions from cleanup. Small protected regions remain flagged rather than silently enlarged into invented anatomy.

All manual artwork edits live apart from source pixels. Cached mode variants use a processing signature; presentation-only controls must not erase merged regions. Include framing, analysis and source-space importance strokes in that signature. Restore saved artwork without re-segmenting away manual region merges.

## Storage

IndexedDB `paper-pigment`: `projects` keyed by ID; `preferences` for palette and notebook. JSON imports validate optional framing, source strokes, analysis, original bytes and artwork diagnostics. Malformed nested values return a validation failure rather than throwing. New fields should migrate via defaults and validated optional fields, not break existing version-1 backups. Original upload bytes may be much larger than the normalized image; handle quota errors visibly.

## Performance/privacy

Use workers for pixel processing and local vision inference. Terminate obsolete jobs. Models load on demand, are served from the same static origin, and are cached after successful use; service-worker cache writes use `waitUntil`. MediaPipe 1.2.3 includes telemetry code: the blob classic-worker bootstrap must inherit a restrictive CSP, and its fetch guard must reject non-origin requests before importing the SDK. No remote CDN URLs are used at runtime. Face `confidence` records the configured 0.6 detection/presence threshold because the SDK supplies no per-face score; it is not a calibrated probability or likeness score.
