# Handoff

## Current request

Build the browser-only photo-to-dot/line-art and notebook app from the user's initial brief. Reference photos informed staggered light-gray letters, top binding, dark/light keys and a reusable protective sheet. Follow-up adds feature-aware subject/face preservation, reviewable suggested crops, a usable crop editor at 1×, and concise handoff Markdown.

## Baseline implemented and verified

React/Vite studio; dot and segmented line artwork; CIELAB marker matching; manual recoloring/region merging; IndexedDB; JSON backups; vector PDF/SVG and 300-dpi PNG; notebook assembly; ten-file manufacturing ZIP; Pages workflow and offline assets. Initial verification: 19 unit/integration tests and six browser scenarios (the final sixth run was interrupted by follow-up). Earlier five-scenario run passed. Samples are in `examples/`.

## Follow-up completed (2026-11-16)

- Reversible crop dialog, 1× pan with margins, drag/resize/keyboard nudges and suggestion review are connected and browser-tested. Original bytes survive JSON/IndexedDB round trips unchanged.
- Self-hosted face/object/classifier inference runs in Chromium; missing assets fall back to saliency. Production CSP, fetch guard and lazy offline model caching are verified. Fixed a syntax error in the CSP Vite plugin, robust URL fetch guarding, worker-start failure handling and service-worker cache-write lifetime.
- Feature priorities, source-space importance painting, rotated/mode-switched edits and 4/8-color comparison proofs are verified. Legacy version-1 backups migrate defaults; merged artwork survives reopening. Optional-field/diagnostics validation rejects malformed JSON safely.
- Real photos: NASA astronaut (face), Chelsea cat (object detector), outdoor rocket (classifier mislabels it as drilling platform). A close two-photo composite exercises multiple faces. Zero external HTTP requests observed. See [TESTING](TESTING.md) and [fixture attribution](../tests/fixtures/README.md).
- Checks: **24 unit tests, production build and all 11 Chromium scenarios pass**. Three-page comparison PDF visually reviewed with Poppler. README updated to reflect actual crop/original-file/model behavior.

## Remaining limits / next work

- Real profile, glasses, lighting, group, flower and landscape photos remain unverified. The multi-face composite is not a real group photo. Full-portrait detail at 24 columns/four colors remains weak; diagnostics warn about small eye separation. Do not claim likeness.
- Safari/Firefox and physical marker/paper proofs remain manual. Marker demo swatches remain unverified. No deployment target or remote has been provided.

## Environment

Working directory: `/Users/krissutantio/Documents/ChatGPT/PictureToDots`.
No Git remote configured; no public deployment performed. Browser preview may be open at `http://127.0.0.1:5173/`; check whether the server is still running rather than starting duplicate servers. Sandbox often requires approval for local server/browser processes and dependency downloads.

## User preferences

Continue autonomously; implement and test rather than stop at a plan. User specifically dislikes the old zoom-dependent crop sliders. Explain limitations honestly. Preserve their original images and private reference files.
