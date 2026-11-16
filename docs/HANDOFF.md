# Handoff

## Current request

Latest: remove per-cell positioning constraints; add a notebook Home gallery and fixed-height, collapsing-step studio; support iOS Home Screen standalone installation; apply a navy theme and document everything.

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

## Remaining limits / next work

- Real profile, glasses, lighting, group, flower and landscape photos remain unverified. The multi-face composite is not a real group photo. Full-portrait detail at 24 columns/four colors remains weak; diagnostics warn about small eye separation. Do not claim likeness.
- Safari/Firefox and physical marker/paper proofs remain manual. Marker demo swatches remain unverified. The GitHub target is configured; check the latest main-branch deployment in Actions.

## Environment

Working directory: `/Users/krissutantio/Documents/ChatGPT/PictureToDots`.
`origin`: `https://github.com/krissutantio/PictureToDots.git`. `main` tracks `origin/main`; baseline adaptive/60-color commit `5731209` was pushed. The Home/free-placement/PWA/navy release publishes through the Pages workflow on pushes to `main`. Verify the latest release in [Actions](https://github.com/krissutantio/PictureToDots/actions) and confirm its manifest and asset references on the live site. Browser preview may be open at `http://127.0.0.1:5173/`; check whether the server is still running rather than starting duplicate servers. Sandbox often requires approval for local server/browser processes and dependency downloads.

## User preferences

Continue autonomously; implement and test rather than stop at a plan. User specifically dislikes the old zoom-dependent crop sliders. Explain limitations honestly. Preserve their original images and private reference files.
