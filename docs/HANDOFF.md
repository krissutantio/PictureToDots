# Handoff

## Current request

Latest: continued the director/Sol feedback loop on captured portrait detail. Selected measured ridge candidates plus closer supported-detail spacing; rejected random-candidate inflation and weaker ridges after matched proofs. V1/V2 saved layouts remain explicit upgrades. See [PORTRAIT_DETAIL_EXPERIMENTS](PORTRAIT_DETAIL_EXPERIMENTS.md) and the 2026-11-17 results below.

Build the browser-only photo-to-dot/line-art and notebook app from the user's initial brief. Reference photos informed staggered light-gray letters, top binding, dark/light keys and a reusable protective sheet. Follow-up adds feature-aware subject/face preservation, reviewable suggested crops, a usable crop editor at 1×, and concise handoff Markdown.

## Baseline implemented and verified

React/Vite studio; dot and segmented line artwork; CIELAB marker matching; manual recoloring/region merging; IndexedDB; JSON backups; vector PDF/SVG and 300-dpi PNG; notebook assembly; ten-file manufacturing ZIP; Pages workflow and offline assets. Initial verification: 19 unit/integration tests and six browser scenarios (the final sixth run was interrupted by follow-up). Earlier five-scenario run passed. Samples are in `examples/`.

## Follow-up completed (2026-11-16)

- Reversible crop dialog, 1× pan with margins, drag/resize/keyboard nudges and suggestion review are connected and browser-tested. Original bytes survive JSON/IndexedDB round trips unchanged.
- Self-hosted face/object/classifier inference runs in Chromium; missing assets fall back to saliency. Production CSP, fetch guard and lazy offline model caching are verified. Fixed a syntax error in the CSP Vite plugin, robust URL fetch guarding, worker-start failure handling and service-worker cache-write lifetime.
- Feature priorities, source-space importance painting, rotated/mode-switched edits and 4/8-color comparison proofs are verified. Legacy version-1 backups migrate defaults; merged artwork survives reopening. Optional-field/diagnostics validation rejects malformed JSON safely.
- Real photos: NASA astronaut (face), Chelsea cat (object detector), outdoor rocket (classifier mislabels it as drilling platform). A close two-photo composite exercises multiple faces. Zero external HTTP requests observed. See [TESTING](TESTING.md) and [fixture attribution](../tests/fixtures/README.md).
- Checks: **24 unit tests, production build and all 11 Chromium scenarios pass**. Three-page comparison PDF visually reviewed with Poppler. README updated to reflect actual crop/original-file/model behavior.

## Adaptive layout and 60-color follow-up (2026-11-16)

- Added opt-in **Letter placement → Adaptive** with deterministic irregular centers, varied sizes, source-cell editing, physical collision/bounds checks and advisory missing-region coverage. Shared geometry drives SVG/PNG/PDF, comparisons and notebook exports. Regular grids and existing edits remain available. See [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md).
- New work defaults to 60 colors, with 60 enabled unverified starter swatches. Full-set matching considers all enabled colors; A–Z/AA–BH labels, wrapped legends and paginated keys replace the old 26-color ceiling. Untouched old demo preferences upgrade; customized palettes and saved projects keep their content.
- **Palette limitation:** exact official Maui 60 codes/colors remain unverified. Starter swatches are clearly labeled demo data. Physical matching still needs the actual chart/calibrated inks.
- Checks: **28 unit tests, production build and all 14 Chromium scenarios pass**. Reviewed adaptive flower/portrait template and colored PDFs plus all four 60-color key pages. Added missing-region advisories, physical export guards and a scrollable 60-color sidebar. See [TESTING](TESTING.md).

## Home / free placement / standalone follow-up (2026-11-16)

- Continuous adaptive v2 samples the full artwork area and a higher-resolution observed color field. Multiple independently editable marks can share a raster cell. Legacy JSON and IndexedDB pages keep v1 until explicit upgrade; source images, palettes, physical limits and old edits survive. See [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md).
- Home lists multiple local notebooks with create/edit actions and compatibility migration from the old single-notebook preference. The studio fits the viewport, opens only one step, progresses after crop review, pins exports and uses overlay panels on mobile. Shared compact navy navigation replaces the tall header. See [WORKSPACE](WORKSPACE.md).
- Added standalone manifest, PNG/SVG icons, Apple metadata, safe-area CSS and offline install-resource caching. Install instructions are on Home and in [INSTALL](INSTALL.md). The user has approved publishing this release; actual iPhone installation remains manual.
- Checks: **30 unit tests, production build and all 17 Chromium scenarios pass**. Coverage includes high-resolution observed detail, independent mark edits, legacy upgrade, notebook persistence, no document overflow at 1440/1280/1024 widths, mobile panels, subpath manifest/icons and offline Home/model inference. Flower/portrait template and colored PDFs rendered and visually checked; no clipping/overlapping marks observed.

## Reference spacing / chart palette / symbol follow-up (2026-11-16)

- New projects use reference-spacing v3: continuous independent centers, larger marks first in low-detail areas, explicit whitespace and variable 2–3.2 mm diameters. Existing v1/v2 projects retain coordinates and physical limits until explicit upgrade. See [ADAPTIVE_LAYOUT](ADAPTIVE_LAYOUT.md).
- All 60 default marker numbers now match the user-supplied retailer chart. RGB values are sampled chart estimates, **not calibrated ink or official sRGB data**. Each color has a permanent single-character symbol across images; shared vector outlines render consistently in UI/SVG/PNG/PDF. See [PALETTE](PALETTE.md) for provenance and the full mapping.
- Swatches display physical numbers, with symbols alongside/in the key. Inline number edits preserve recoloring and undo history. Untouched demo preferences migrate; customized palettes and saved projects remain intact. Old projects offer explicit chart-palette replacement or symbol-only upgrade. Historical AA/BA labels denoted one color each, not two dots.
- Illustrated contour/hatching mode is **deferred**, with the supplied dog's fur, pickup, flowers, pumpkins and leaves described in [LINE_ART_REFERENCE](LINE_ART_REFERENCE.md); tracked in [ROADMAP](ROADMAP.md). Current segmented line art remains available. Private reference images are not bundled.
- Checks: **32 unit tests, production build and all 17 Chromium scenarios pass**. Reviewed flower/portrait template and colored PDFs plus all four symbol-key pages with Poppler: no clipping or overlapping marks observed. Browser coverage includes marker-number changes through undo/redo, stable symbols, old-project migration, local-only requests and offline production inference. Physical symbol/ink proofing remains manual.
- Published as `8ca9812`; [Pages workflow 43919941171](https://github.com/krissutantio/PictureToDots/actions/runs/43919941171) succeeded. Live Chromium verified the matching build asset, 60 physical codes, 60 unique symbols, adaptive default and no page errors. Older saved projects retain prior settings.

## Portrait simplification prototype (2026-11-16)

- Added **Portrait Simplification** to Conversion priority. It smooths minor tonal variation and reserves small dots for observed local contrast near facial features; it does not draw from landmark shapes. The stored `portraitV1` evidence is optional and validated. Existing projects, dot settings and Line Art retain their previous behavior.
- Matched private proofs at 5 × 7 in, 60 sampling columns, 12/60 colors and 2–3.2 mm dots: closer crops retain more eye/mouth detail; glasses frames still partially merge with eyes. Centered Photo Booth proof clips one detected eye. User visual acceptance and physical ink proofs are pending.
- **34 unit tests, production build, all 18 Chromium scenarios passed.** Rendered closest 12-color PDFs; no symbol clipping/overlap in reviewed output. Private proof artifacts are outside the repo; no outbound HTTP requests in the private run. Work is local; no push or deploy.

## Review and comparison fixes (2026-11-16)

- Read the project documentation and reviewed the four private centered/closer comparison sheets (12/60 colors), plus both closer source/tone/packing breakdowns. Portrait likeness remains unresolved: glasses/eyes merge, nose/mouth detail is sparse, and the centered Photo Booth crop clips an eye. No algorithm/physical-limit changes or private-image publication.
- Fixed Strategies reprocessing the active artwork and potentially losing merged regions. Completed artwork is retained across preview switches; Color Accuracy no longer invalidates on unused analysis/stroke data. Comparison jobs clear previous results before regeneration.
- Strategies now shows the actual accepted source crop/rotation using the shared input sampler. Corrected stale README deployment history and adaptive-layout defaults/palette documentation.
- Checks: **34 unit tests pass; production build passes; all 18 Chromium scenarios pass**. Extended merged-region regression covers Strategies round trip; portrait scenario checks the sampled source preview. Initial browser launch was sandbox-blocked; authorized rerun succeeded. One test-edit mistake was corrected before the final full pass. Generated example timestamp changes were discarded.
- Changes remain local, not deployed. Safari/Firefox, physical ink calibration, printed symbol readability and user acceptance of likeness remain open.

## Portrait detail and notebook deletion (2026-11-16)

- Directed Sol implementation/evaluation agents. Accepted the second matched candidate: measured light/dark ridges and mouth contrast, wider observed glasses-rim search, and similar-ink support restricted to facial tones. New `portraitV2` evidence is validated; saved v1 geometry remains exact. Old portraits offer **Review updated portrait detail → Use updated portrait**, with Undo/Redo restoring old artwork and edits.
- Reviewed both closer 12/60-color proofs plus centered 12-color proofs. Lips and parts of lower glasses rims improve; small centered faces and eye/frame overlap remain limited. Same source crop, palette, 5 × 7 in, 60 columns and 2–3.2 mm limits. Private eight-case proof harness checked source bytes, physical bounds/spacing, palette membership and round trips; zero external requests. See [portrait results](PORTRAIT_SIMPLIFICATION.md). Private review copies are ignored under `test-results/portrait-review/`.
- Home **Delete** confirms notebook/page removal and preserves separately saved projects. Atomic library/active/legacy persistence prevents resurrection, including last-notebook deletion and stale tabs. Stale deleted editors return Home rather than redirecting further typing into another notebook. See [WORKSPACE](WORKSPACE.md).
- Final checks: **36 unit tests pass; production build passes; all 19 Chromium scenarios pass**. Includes legacy geometry hash, subcell disk support, V2 validation, negative importance strokes, explicit upgrade/Undo/Redo, cancel/nonactive/active/last deletion, reload, stale tabs and create-after-empty. Desktop/mobile delete controls visually reviewed. Generated example timestamp changes discarded.
- Work remains local; no push/deploy. Broader real portraits, Safari/Firefox, physical ink/paper and user likeness acceptance remain pending.

## Detail feedback loop (2026-11-17)

- Directed three Sol agents through implementation, independent evaluation and code review. Selected `portraitV3`: measured ridge candidates plus 0.45 mm whitespace between supported detail pairs. Diameter/palette/crop/resolution stay fixed; ordinary reference spacing stays intact. Compared isolated ridge/spacing arms, 3× random samples, support/ranking alternatives, larger gaps and weaker ridges. See [experiment record](PORTRAIT_DETAIL_EXPERIMENTS.md).
- Closer eyes/glasses improve over V2 at modest count increases; nose detail remains weak and the clipped Photo Booth crop has some regressions. Final private/public 14-case harness passed source, palette, geometry and round-trip checks with **zero external requests**. Rendered two symbol PDFs with Poppler: no overlap/clipping observed. Private before/after and method sheets remain ignored in `test-results/portrait-review/`.
- Fixed stable ridge-ID namespace across size changes; preserved exact V1/V2 output. V1/V2 review/apply and Undo/Redo are browser-covered. Hoisted invariant glyph sizing and numeric bucket storage reduce placement work. Independent imported-field/large-page/legacy-label stress checks passed.
- Checks: **37 unit tests, production build and all 19 Chromium scenarios pass**; the strengthened dot-ID regression also passes its focused suite. Generated example timestamp changes restored. Documentation updated. Sol agents hit their usage limit after the experiments; director completed proof selection, verification and docs.
- No push/deploy. Actual marker/paper, Safari/Firefox, broader portraits and user likeness acceptance remain pending.

## Release verification (2026-11-17)

- Release checks rerun: 37 unit tests passed, production build succeeded, and all 19 Chromium scenarios passed. Check [GitHub Actions](https://github.com/krissutantio/PictureToDots/actions) for the deployment result for this commit.

## Remaining limits / next work

- Reviewed the user's ten UI design suggestions in [UI_DESIGN_NOTES](UI_DESIGN_NOTES.md). Useful candidates: nested radii, alpha panel borders and matched icon weights; dynamic viewport sizing already exists. Dark mode/animated swaps are deferred; OKLCH and blending must not alter marker colors or artwork. UI polish remains documentation only.

- Real profile, glasses, lighting, group, flower and landscape photos remain unverified. The multi-face composite is not a real group photo. Full-portrait detail at 24 columns/four colors remains weak; diagnostics warn about small eye separation. Do not claim likeness.
- Safari/Firefox and physical marker/paper proofs remain manual. Chart-derived RGB estimates need calibration. The GitHub target is configured; check the latest main-branch deployment in Actions.

## Environment

Working directory: `/Users/krissutantio/Documents/ChatGPT/PictureToDots`.
`origin`: `https://github.com/krissutantio/PictureToDots.git`. `main` tracks `origin/main`; baseline adaptive/60-color commit `5731209` was pushed. The Home/free-placement/PWA/navy release publishes through the Pages workflow on pushes to `main`. Verify the latest release in [Actions](https://github.com/krissutantio/PictureToDots/actions) and confirm its manifest and asset references on the live site. Browser preview may be open at `http://127.0.0.1:5173/`; check whether the server is still running rather than starting duplicate servers. Sandbox often requires approval for local server/browser processes and dependency downloads.

## User preferences

Continue autonomously; implement and test rather than stop at a plan. User specifically dislikes the old zoom-dependent crop sliders. Explain limitations honestly. Preserve their original images and private reference files.
