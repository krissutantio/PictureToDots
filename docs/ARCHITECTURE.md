# Architecture map

## Entry points

| Concern                             | Files                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Home library / step flow            | `src/Home.tsx`, `src/StepPanel.tsx`, [WORKSPACE](WORKSPACE.md)                  |
| React studio/navigation/state       | `src/main.tsx`, `src/types.ts`                                                  |
| Crop geometry and editor            | `src/crop.ts`, `src/CropEditor.tsx`                                             |
| Source sampling/original retention  | `src/input.ts`, `src/samples.ts`                                                |
| Subject orchestration               | `src/analysis.ts`, `src/analysis.worker.ts`, `src/saliency.ts`                  |
| Local model inference               | `public/vision/model-worker.js`, model files in the same folder                 |
| Feature importance/preprocessing    | `src/features.ts`, `src/ImportanceEditor.tsx`, `src/subject-types.ts`           |
| Palette/segmentation/print geometry | `src/processing.ts`, `src/processor.worker.ts`                                  |
| Strategy comparison                 | `src/StrategyComparison.tsx`                                                    |
| Adaptive mark packing               | `src/dots.ts`, `src/free-dots.ts` (shared physical geometry, versioned packing) |
| Rendering/downloads                 | `src/render.ts`, `src/export.ts`                                                |
| Persistence/import validation       | `src/storage.ts`                                                                |
| Deployment/offline                  | `vite.config.ts`, `scripts/service-worker.mjs`, `.github/workflows/deploy.yml`  |

## Coordinate contracts

- Detected boxes, facial points and importance brush points use normalized **unrotated source** coordinates (0–1). Never store these in preview CSS pixels.
- `Project.framing` uses center/zoom in the **rotated source** coordinate system. `cropRect` returns normalized crop dimensions; white-margin framing may extend outside 0–1.
- `cropPoint` rotates a source point, then maps it into the accepted crop. `unrotatePoint` reverses that mapping for importance sampling.
- `Settings.crop/cropX/cropY` are legacy fields. `legacyFrame` preserves old saved projects; new UI uses `framing`.
- Print geometry is points (72/inch). The processing raster remains regular. `Settings.dotLayout` explicitly selects regular/staggered marks or deterministic adaptive placement; conversion priority never selects a layout or changes resolution. Version-2 adaptive centers have independent stable IDs plus a source-cell/color reference; legacy centers refer to source cell IDs and use physical points from the same `dotMarks` helper in SVG/PNG/PDF. Layout uses unedited saved artwork, so recoloring cannot move it. See [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md).

## Data flow

Upload → retain original bytes + normalized local image → subject analysis → suggested crop review → prepareInput (rotation/crop, baseline grid and higher-resolution buffers) → processing worker → SVG/PDF/export.

Color Accuracy uses the existing baseline pipeline. Other priorities preprocess higher-resolution pixels before reduction, compute importance/edge maps, weight palette selection and structural luminance decisions, and protect critical measured regions from cleanup. Small protected regions remain flagged rather than silently enlarged into invented anatomy.

All manual artwork edits live apart from source pixels. Cached mode variants use a processing signature; presentation-only controls must not erase merged regions. Include framing, analysis and source-space importance strokes in that signature. Restore saved artwork without re-segmenting away manual region merges.

## Storage

IndexedDB `paper-pigment`: `projects` keyed by ID; `preferences` for palette and notebook. JSON imports validate optional framing, source strokes, analysis, original bytes and artwork diagnostics. Malformed nested values return a validation failure rather than throwing. Missing `dotLayout` migrates to `regular`; stored color budgets/palettes are retained. New projects use a 60-color budget; only the untouched legacy demo preference upgrades to 60 chart-estimated swatches. New fields should migrate via defaults and validated optional fields, not break existing version-1 backups. Original upload bytes may be much larger than the normalized image; handle quota errors visibly.

## Performance/privacy

Use workers for pixel processing and local vision inference. Terminate obsolete jobs. Models load on demand, are served from the same static origin, and are cached after successful use; service-worker cache writes use `waitUntil`. MediaPipe 1.2.3 includes telemetry code: the blob classic-worker bootstrap must inherit a restrictive CSP, and its fetch guard must reject non-origin requests before importing the SDK. No remote CDN URLs are used at runtime. Face `confidence` records the configured 0.6 detection/presence threshold because the SDK supplies no per-face score; it is not a calibrated probability or likeness score.

## Full-set print keys

Full-set matching bypasses subset pruning when the budget covers all enabled markers. Output supports up to 60 colors; current defaults use permanent single-character vector symbols, while legacy A–Z/AA–BH labels remain supported for older projects. Disabled entries never participate. Wrapped legends reserve header rows; individual keys and notebook overviews paginate. Small physical pages whose legend/margins consume the artwork area are blocked. Current marker numbers come from the supplied chart; RGB values remain uncalibrated estimates. See [PALETTE](PALETTE.md).

## Standalone web app

See [INSTALL](INSTALL.md) for manifest/icon paths, iOS installation, offline behavior and device-verification limits. [WORKSPACE](WORKSPACE.md) documents multi-notebook preference migration and the fixed-height shell. Dot workers attach a validated high-resolution color/importance field for continuous placement while retaining the original regular artwork for compatibility.

## Marker identity and reference spacing

See [PALETTE](PALETTE.md) for the chart source, permanent symbol mapping and code display. `symbols.ts` and `reference-symbols.json` provide shared vector glyphs; `MarkerGlyph.tsx` renders the same paths in the UI. Matching signatures use marker IDs/hex/enabled state, not human labels. `editedArt` resolves current names/codes/symbols without recoloring saved assignments. Metadata edits update history snapshots so undo does not discard a newly entered code. V3 placement is coarse-to-fine with whitespace; legacy geometry remains versioned.

The future illustrated-hatching mode is specified only in [LINE_ART_REFERENCE](LINE_ART_REFERENCE.md) and [ROADMAP](ROADMAP.md); its algorithm is not implemented.

## Portrait simplification

The opt-in Dot Art priority calls `simplifyPortrait` with crop-mapped landmark
neighborhoods and observed pixels. Its selective smoothing and bounded contrast
evidence feed existing color matching. A validated optional `dotField.portraitV1`
map activates feature-first placement in v3 only; it is a packing contract for
this prototype, not a change to existing v3 projects. All geometry/export paths
continue through `dotMarks`. `comparisonPriorities` selects the matched baseline
and prototype for the studio and PDF together. See
[PORTRAIT_SIMPLIFICATION](PORTRAIT_SIMPLIFICATION.md) for limits and proof results.
