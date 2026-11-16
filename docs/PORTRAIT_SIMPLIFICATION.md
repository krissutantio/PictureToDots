# Recognizable portraits through selective simplification

Status: **first opt-in implementation, local and awaiting visual acceptance**
(2026-11-16). In **Style & detail**, select **Conversion priority → Portrait
Simplification**. With reference spacing, **Strategies** compares it with
Color Accuracy and Maximum Recognizability under the same settings.

## Goal and reported failure

Keep observed facial structure readable at the chosen print size while simplifying
small tonal variations and distracting background texture. Pixel-color similarity
alone is not the success criterion.

In two supplied comparisons, broad hair/skin areas survive but eyes, glasses,
nose and mouth become scattered marks. The screenshots show an older palette
and placement UI: reproduce on the current release before attributing failures
to the current algorithm. Landmark weighting, importance painting and higher-
resolution sampling already exist; adding detection alone will not solve this.

Adaptive/reference placement already defaults on for fresh projects. Keep that
default and preserve existing projects' saved layout versions, edits and sizes.

## Private evaluation references

| Original supplied by user       | Visible structure to preserve                                                                  | Complications                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `Photo on 11-5-26 at 15.43.jpg` | Eye spacing and eyelid/lash boundaries, brows, nose shadows, lip outline, face/hair silhouette | Uneven lighting, phone/background detail, second partially visible face          |
| `IMG_3842.jpeg`                 | Eyeglass frames/bridge, eyes inside frames, brows, nose/mouth, face/hair silhouette            | Reflections and lashes, crowded shelves, plush toy occupying much of composition |

Locate originals through the attachments for local evaluation. Keep
local paths out of shared fixtures. Do not copy originals, crops, screenshots or
derived portrait proofs into `public/`, tracked `examples/`, Git or deployment
artifacts. Use ignored `test-results/` or an external temporary directory. Public
fixtures can test mechanics but cannot establish success on these private photos.

## Desired behavior

- Preserve observed relative eye spacing, eye-line angle, mouth position, face
  proportions, expression and visible asymmetry.
- Keep coherent boundaries for brows, eyelids, glasses, lips, nostril shadows and
  face/hair outlines wherever detectable and physically resolvable.
- Simplify cheeks, forehead, clothing and background into coherent tonal areas;
  avoid speckled skin or isolated dark dots from minor lighting fluctuations.
- Reserve smaller, deliberately positioned marks for important boundaries; use
  larger, roomier marks across simpler areas without returning to rows/columns.
- Keep glasses and eyes distinct when source detail and physical size permit;
  do not collapse dark frames and eyes into one solid patch.
- Use only enabled inks and the explicit color budget. All 60 colors remain
  eligible by default; forcing every color into each image is unnecessary.
- Report uncertainty or insufficient physical detail. Suggest a tighter crop,
  larger paper or changed permitted mark size for explicit review; never silently
  change these constraints to achieve a better-looking result.

## First implementation

- **Selective tonal smoothing:** two scales of range-weighted averaging reduce
  small variations, while a local dark-contrast map protects observed details.
  Landmark neighborhoods restrict the search; no feature outline is drawn
  from coordinates. A wider eye neighborhood can retain pieces of an observed
  frame but does not detect glasses as an object.
- **Feature-reserved placement:** evidence above threshold gets first choice
  of space, with marks at the configured minimum diameter. A mark must be
  centered in the assigned ink and supported by at least 34% of sampled disk
  area in that ink. This intentionally permits some overlap of other colored
  regions to represent thin supported detail. It still rejects paper cutouts
  and collisions. All ordinary marks keep the full same-ink footprint test.
- **Compatibility:** a validated optional `dotField.portraitV1` evidence map
  explicitly selects the new packing behavior inside adaptive v3. V1/v2 and
  old v3 projects without that field keep existing packing. Regular and older
  adaptive modes can display the simplified tones without feature reservation.
  Line Art keeps existing feature-aware processing; the portrait pipeline
  never runs there. Without detected facial landmarks the mode falls back to
  generic feature-aware processing and shows a warning.
- **Palette:** keep existing weighted matching for the reduced field and
  nearest enabled ink for the detail field. Feature evidence weights the
  reduced field. A dedicated boundary-aware palette optimizer is still a
  proposal. Photos with several detected faces give each visible face a
  search window; explicit per-face selection is also future work. The
  importance brush can raise or suppress the priority of observed evidence.
- **Physical advisory:** if measured eye separation within the crop is below
  four minimum dot diameters on the current print layout, show an advisory.
  A separate warning flags a detected eye outside the crop. These are
  checks for review, not a promise of likeness above either threshold.

## Private proof results

Local Chromium used the current release's Maximum Recognizability as baseline.
Each pair used 5 × 7 in paper, 60 sampling columns, adaptive v3, 2–3.2 mm dots
and the same chart palette. Compare within a row: the 60-color legend uses
more print area than the 12-color legend. The table records baseline → portrait
mark counts. Centered and closer proof crops are separate local experiments;
neither replaces the user's framing.

| Photo / crop           | 12-color limit | 60-color limit | Visual observation                                                                                                        |
| ---------------------- | -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Photo Booth / centered | 610 → 612      | 450 → 461      | One detected eye is outside the crop. Mouth slightly stronger; overall facial structure remains unresolved.               |
| Photo Booth / closer   | 593 → 648      | 468 → 501      | Eye/lash and mouth clusters read better. Nose detail and expression remain incomplete; face/hair outline broadly similar. |
| Glasses / centered     | 509 → 486      | 363 → 355      | More dark structure at the eye line with fewer total dots. Frame shape and eyes remain difficult to tell apart.           |
| Glasses / closer       | 520 → 564      | 372 → 415      | Eye area improves most. Nose and lips are still sparse; frames and eyes partly merge. Background remains prominent.       |

A third proof arm kept the simplified input with ordinary v3 packing. Its eye
areas still dropped thin strokes, especially in the glasses reference; reserving
positions did more for that area than smoothing alone. Closer proofs have a
higher mark count, so those improvements cannot all be attributed to reallocation
at equal counts. Chromium detected one face per supplied photo and made zero
external HTTP requests. Example processing plus first mark placement took
about 0.5–0.8 s for the new option on this host, excluding local model inference.
PDF symbol templates were rendered for visual inspection, not printed on paper.
The user has not yet accepted the likeness. Private proofs remain out of Git
and deployment assets.

## Integration and compatibility

| Concern                   | Existing integration point / contract                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature maps and sampling | `src/features.ts`, `src/input.ts`, `src/subject-types.ts`: use high-resolution observed source, not only the reduced grid                               |
| Inference                 | `src/analysis.ts`, `public/vision/model-worker.js`: reuse bundled local assets and request isolation                                                    |
| Processing/palette        | `src/processor.worker.ts`, `src/processing.ts`: retain baseline comparison and explicit sampling/color budgets                                          |
| Placement                 | `src/free-dots.ts`, `src/dots.ts`: version new geometry; retain v1/v2/v3 output and stable manual-edit IDs                                              |
| Review UI                 | `src/ImportanceEditor.tsx`, `src/StrategyComparison.tsx`, `src/main.tsx`: reuse the bounded studio panels                                               |
| Save/import               | `src/types.ts`, `src/storage.ts`: validate optional fields; old projects default to prior behavior; include new processing controls in cache signatures |
| Rendering                 | `src/render.ts`, `src/export.ts`: shared geometry and permanent symbols for preview/SVG/PNG/PDF/notebooks                                               |

Retain original upload bytes. Simplification and annotations must be reversible;
store annotations in normalized unrotated source coordinates and transform them
through crop/rotation with existing helpers. Test image-edge and rotated crops.
Preserve saved artwork and manual edits on reopening; do not silently reprocess.

Heavy work stays in cancellable workers. No uploads, paid APIs, accounts, API keys
or external requests. Missing models fall back visibly to observed generic
structure and user strokes. The configured face threshold is not a calibrated
probability or likeness score. Never fabricate landmarks, symmetrize/beautify,
complete hidden anatomy or generate a generic replacement face. Identity
recognition is unnecessary.

## Evaluation and acceptance

Isolate simplification, palette choice and packing in separate experiments so an
improvement has an identifiable cause. Within each comparison hold crop, paper,
sampling resolution, color budget, enabled palette and physical diameter range
constant. Record mark counts; distinguish denser output from better allocation
at a comparable mark budget. Constraint changes need a separately labeled proof
and explicit user choice.

For each photo show original crop, current baseline, simplified intermediate,
proposed colored dots and symbol template, with enlarged facial crops and
actual-size print proofs. Record settings, processing/layout version, detection
status, timing and warnings. Test the default full palette and the screenshots'
12-color setting separately.

Acceptance evidence required before claiming success:

- Review both private photos side by side. Rate eyes/brows, nose, mouth, glasses
  when present, silhouette and expression as improved, unchanged, worse or
  unresolved. User judgment of recognizability is the final visual acceptance
  gate; no automatic metric establishes likeness.
- Show more coherent eyes/mouth without invented features and distinguish glasses
  from eyes. If requested physical size prevents this, report failure rather
  than silently relaxing constraints.
- Cover profile/partial faces, glasses, varied lighting, multiple faces, no face,
  missing models and nonportraits using suitable public/licensed fixtures.
  A duplicated-face composite does not establish real group-photo performance.
- Verify determinism, physical bounds/collisions, enabled-palette membership,
  permanent symbols, independent edits/undo/redo, old JSON/IndexedDB compatibility,
  crop/rotation transforms, cancellation and zero external requests.
- Inspect SVG/PNG and rendered PDFs at print scale for matching geometry and
  symbol readability. Physical ink/paper proofing stays separate. Measure latency
  and document device/results before choosing a performance budget.

Run relevant units, production build and affected browser checks during work;
full browser suite before handoff. Record mechanical results separately from
visual acceptance in [TESTING](TESTING.md) and [HANDOFF](HANDOFF.md).

## Follow-up

Review the private proofs with the user. If glasses/eye separation is still
insufficient, isolate observed frame support and palette contrast in a matched
proof before changing packer thresholds. Compare a user-approved tighter crop,
larger page or different physically proven dot range as a separate experiment.
Broader profile, occlusion, lighting and multiple-person validation remains
open. Illustrated contour/hatching stays separate in
[LINE_ART_REFERENCE](LINE_ART_REFERENCE.md).
