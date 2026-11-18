# Recognizable portraits through selective simplification

In **Style & detail**, select **Conversion priority → Portrait Simplification**.
With reference spacing, **Strategies** compares it with Color Accuracy and
Maximum Recognizability under the same settings. The updated strategy improves
some features in the closer private proofs. The latest ridge-placement/spacing feedback loop is recorded in [PORTRAIT_DETAIL_EXPERIMENTS](PORTRAIT_DETAIL_EXPERIMENTS.md). Visual acceptance is pending.

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

## Processing and placement

- **Selective tonal smoothing:** two scales of range-weighted averaging reduce
  small variations while preserving measured dark creases, light gaps and
  mouth color contrast. Crop-mapped landmarks bound the pixel search. The
  wider eye-line search measures dark ridges visible in the source and can
  pick up parts of a lower glasses rim. Glasses have no dedicated detector.
  Importance strokes can strengthen or suppress measured evidence.
- **Feature-reserved placement:** adaptive v3 ranks supported detail by
  evidence and disk coverage, then reserves minimum-diameter dots first.
  The center keeps its assigned ink. At least 25% of the sampled disk must
  support that ink or a similar selected ink. Ordinary dots may span a
  similar-ink boundary when their center is in the facial tone area and at
  least 78% of the sampled disk supports the center ink. Similar inks differ
  by at most 11 in CIELAB lightness and 18 in CIELAB distance. Elsewhere,
  ordinary dots require full same-ink footprints. All disks still reject
  paper cutouts and must fit the configured diameters and bounds. V3 adds observed
  ridge candidates and allows 0.45 mm whitespace between two supported detail
  marks; other pairs retain reference spacing.
- **Palette:** both light and dark evidence influence the reduced samples
  used for palette selection. The detail field matches those selected inks.
  The chosen budget and enabled markers remain explicit. Multiple detected
  faces each contribute their own search windows.
- **Compatibility:** new conversions store `dotField.portraitV3`, with
  high-resolution `evidence` and a reduced `toneArea` mask. Both are validated
  on import. Saved `portraitV2` retains its exact previous packing. Saved `portraitV1` artwork retains its original 34% same-ink
  reservation rule and exact geometry. Regular and pre-v3 adaptive layouts
  render the simplified tones with their own placement rules. Line Art uses
  its existing feature-aware processing. When facial landmarks are unavailable,
  the conversion uses generic structure and shows a warning.
- **Physical advisory:** the app flags an eye outside the crop and measured eye
  separation smaller than four minimum dot diameters on the current print layout.

## Updating a saved portrait

Open the saved portrait and choose **Style & detail → Review updated portrait
detail** to preview the new conversion in **Strategies**. Choose **Use updated
portrait** on the Portrait Simplification card to apply the proof and open the
template. Applying the update resets manual dot colors because centers can
move. **Undo edit** restores the previous artwork and manual colors. The update
uses the accepted crop, print settings and original image from the project.

## Private proof results

Local Chromium compared Maximum Recognizability, the previous Portrait
Simplification and the update on both private photos. Each comparison used the
same accepted crop and sampled source, 5 × 7 in paper, 60 sampling columns,
adaptive v3, 2–3.2 mm dots and the same enabled chart palette. The 60-color
legend leaves less room for artwork. Centered and closer crops are separate
proof settings. The counts below are Maximum Recognizability → previous portrait
→ updated portrait.

| Photo and crop        | 12-color limit  | 60-color limit  | Observed in the update                                                                      |
| --------------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------- |
| Photo Booth, centered | 610 → 612 → 633 | 450 → 461 → 477 | One eye lies outside the crop. Facial structure remains unresolved.                         |
| Photo Booth, closer   | 593 → 648 → 706 | 468 → 501 → 566 | Fuller facial tones and clearer lip contour. Nose detail and expression remain limited.     |
| Glasses, centered     | 509 → 486 → 485 | 363 → 355 → 361 | Eyes and frames remain difficult to distinguish at this size.                               |
| Glasses, closer       | 520 → 564 → 576 | 372 → 415 → 437 | Lower rim segments, nose shadows and lips read more clearly. Eyes and frames still overlap. |

A proof arm with updated tones and ordinary v3 packing continued to lose thin
eye-area detail. In the 12-color closer proofs, the updated packer changed the
face-region counts from 540 to 598 for Photo Booth and from 228 to 247 for
Glasses, compared with the previous portrait. Those gains include more overall
marks. An earlier experiment allowed similar-ink fill throughout the artwork
and added more background marks. The selected version limits that fill rule to
detected facial tone areas.

Chromium detected one face per photo and made zero external HTTP requests.
Across the eight matched cases, worker processing and first placement took
about 0.25–0.51 s on this host, excluding model inference. Every placed mark used
an enabled ink. Diameters and symbol footprints passed bounds and collision
checks, and JSON round trips reproduced the marks. The proofs compare rendered
colored dots and symbol templates. Physical ink and paper proofs and user
acceptance of likeness remain open. Private proofs stay outside Git and
deployment assets.

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
