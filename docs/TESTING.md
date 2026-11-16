# Testing

## Commands

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The E2E configuration starts/reuses Vite at port 5173. Production tests serve `dist/` at port 5178 under `/PictureToDots/` and test offline reload. Build first.

## Existing coverage

`tests/core.test.ts`: CIELAB, palette validity, independent difficulty/grid count, coherent regions, cleanup, labels, white paper, physical layout, SVG escaping, PDF dimensions/bleed, auxiliary PDFs, shared contour edges, unsafe imports.

`tests/e2e/studio.spec.ts`: modes, recoloring/undo, local persistence, exports/ZIP/order, mobile layout, palette management, image upload/backup import, merged-region restoration.

`tests/e2e/examples.spec.ts`: regenerates four original procedural study projects and both art modes in `examples/`. These are illustrations, not evidence of photographic facial likeness.

`tests/e2e/production.spec.ts`: repository base path and offline production assets.

## Follow-up verification (2026-11-16)

- `npm test`: 24 tests across core and feature suites. Crop geometry/legacy defaults, rotated source-space importance strokes, 4–8-color palette/grid invariants, protected detail and malformed optional fields are covered.
- `npm run build`: passes, including the CSP and generated service worker.
- `npm run test:e2e`: 11 Chromium scenarios, including the full baseline workflows and the follow-up checks below.
- `editing.spec.ts`: real-photo upload, suggested crop, 1× nudging, pointer drag/resize, keyboard movement, margin constraint, accept/reject, brush/rotation/mode changes, 4/8-color comparisons and PDF download. IndexedDB and JSON round trips preserve source strokes, framing and original bytes exactly.
- `vision.spec.ts`: actual face/object/classifier inference. NASA astronaut: one face; close duplicated-photo composite: two faces; Chelsea cat: object-detected cat; outdoor rocket: classifier suggests **drilling platform (incorrect)**. Blank input has no fabricated faces. Missing-model fallback and cancellation pass. Context-wide request monitoring sees zero external HTTP requests; string/URL/Request forms of an external worker fetch are blocked.
- `production.spec.ts`: repository subpath, production CSP, app reload offline, and actual cached face-model inference offline. Vision response caching uses `waitUntil` to retain writes through service-worker lifecycle changes.
- Three-page 5 × 7 comparison PDF rendered with Poppler and all three pages visually inspected: no clipping/overlap. At 24 columns and four colors the full portrait has poor facial detail; the eye-separation warning is present. This verifies layout and honest limitations, not likeness.
- Real-photo fixtures and attribution live in `tests/fixtures/README.md`; they are outside `public/` and not shipped. Test screenshots/PDFs stay ignored in `test-results/`.

## Remaining acceptance work

- Cropping: drag/nudge at 1×; white-margin toggle; fit/center/resize; accept/reject; original retained; rotation and reload.
- Subject analysis: real model result, multiple faces, no face, low confidence, missing assets/offline fallback, cancellation, no external network requests.
- Feature strategies: Color Accuracy unchanged; palette membership/grid preserved; protected details not erased by isolated-dot/region cleanup; no manufactured landmarks.
- Importance edits: source-coordinate strokes survive crop/mode switches and JSON/IndexedDB round trips.
- Compare original/standard/balanced/feature at thumbnails and real PDF dimensions. Eye separation and edge metrics are diagnostics, not guarantees.
- Expand real-photo cases to profile, glasses, varied lighting, actual groups, flowers and landscapes. The multi-face composite is not a real group photo. The existing flower/landscape studies are drawings.

## Visual PDF review on this host

Bundled `pdftoppm` is available, but its default fontconfig path may be invalid. A temporary FONTCONFIG_FILE pointing at `/System/Library/Fonts` and a writable `/tmp` cache resolves it. Render to `/tmp` and inspect PNGs; do not commit caches. Unit PDF dimension tests do not substitute for visual proofing.

## Verification limits

Chromium is automated. Actual marker/paper proofs and Safari/Firefox remain manual. No metric establishes identity likeness. The official marker palette is unverified; calibrate actual inks.
