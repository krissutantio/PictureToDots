# Paper & Pigment

A static, browser-only photo-to-coloring studio built with React, TypeScript and Vite. Create letter-coded dot art or segmented coloring-book outlines, edit colors, save projects locally, and assemble printable spiral-bound notebooks.

## Run locally

Use Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173/`).

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

Build before running the full browser suite: it also tests `dist/` under `/PictureToDots/` and reloads the production app offline. Playwright generates original example artwork in `examples/`. The four included studies—flowers, portrait, animal and landscape—are procedural illustrations created for this application, not external photos.

## What works

- Local JPEG, PNG and WebP upload, browser orientation decoding and 90-degree rotation. Original upload bytes are retained alongside a normalized processing image; crop/rotation never overwrite either.
- Reviewable subject-focused crop suggestions and a draggable, resizable crop editor with keyboard nudging. Enable white paper margins to move in both axes at 1×.
- Optional self-hosted face landmarks, object detection and scene classification, with generic saliency fallback. Color Accuracy, Balanced, Feature Preservation and Maximum Recognizability priorities share your selected grid and physical marker limits.
- Source-coordinate importance brush, measured-feature protection and three-strategy comparison thumbnails with a printable comparison PDF. No generated facial landmarks or promised likeness.
- Dot art with regular/staggered placement or **Adaptive · varied positions & sizes**. Adaptive marks are smaller near measured detail and larger in flat areas, with irregular centers and shared preview/print geometry. Choose it under **Letter placement**; **Advanced settings → Dot diameter** controls its maximum size, and **Minimum usable dot** controls its minimum.
- Adjustable sampling resolution, physical mark sizes, light-gray letters or outlined circles, paper-white regions, cleanup and Floyd–Steinberg dithering. Small regions that cannot receive an adaptive mark are flagged for review.
- Traditional line art and color-by-letter art, based on edge-aware color segmentation, connected components, adjacent-region merging, closed contour tracing, shared-boundary simplification and interior label placement.
- New work defaults to a **60-color budget**, with all 60 starter swatches enabled. **Use full marker set** restores that budget after selecting a smaller limit. Full-set matching considers every enabled entry; images need not use all 60. Smaller budgets use CIELAB/Delta E 76 subset selection and avoid near-duplicate inks. Difficulty and sampling resolution remain independent.
- Unique A–Z/AA–BH keys, wrapped page legends and paginated color keys support all 60 colors. Old saved projects retain their color limits and regular placement.
- Template, colored, source and side-by-side views; zoom and scroll-pan; palette-based dot painting and region recoloring; adjacent-region merging; undo/redo. Mode-specific values and valid mode edits survive switching.
- Configurable page size, binding clearance, margins, bleed and dot-size limits. Unsafe dot templates are blocked from export; narrow line-art regions omit their labels and show a review warning.
- PNG at 300 dpi, vector SVG and vector PDF; separate color-key PDFs and outlines-only line-art PDFs.
- IndexedDB project storage, reopen, title editing, duplication, deletion and JSON backup/import. No accounts or backend.
- Imported/custom palettes, swatch exclusion and editing, printable calibration charts, cropped-scan median sampling, white-reference correction and named paper profiles.
- Notebook ordering, duplication, per-page titles/settings, a title cover, color-key overview by page, individual marker keys, a reusable protective-sheet cutting/instruction page, backing specifications, manufacturing instructions and editable cost assumptions.
- A ten-file manufacturing ZIP, entirely generated in the browser.
- Responsive layouts, labeled controls, keyboard focus styles, live error/status messages and production-only offline asset caching.

## Marker accuracy

The supplied purchase link identifies the intended **Ohuhu Maui 60-color, water-based, fine/brush dual-tip set**. The complete official code-to-color mapping remains unverified. The bundled dataset now contains **60 enabled demonstration swatches** so the full-color workflow works by default. These are **not the official Maui 60 ink colors** and contain no invented manufacturer codes. The [official product page](https://ohuhu.com/products/ohuhu-maui-60-colors-dual-tips-water-based-art-markers-brush-fineliner) confirms the set but does not supply the complete chart used by this app. No manufacturer codes, current prices, availability, tip diameters or ink-accuracy claims are fabricated.

Before using physical markers:

1. In Marker Sets, replace/add entries with identifiers from your actual markers, or import a collection.
2. Select your paper profile, print the calibration chart, and fill its boxes.
3. Scan it flat. Crop precisely to the outer rectangular frame; the app does not automatically rectify perspective or locate the chart.
4. Select the chart sheet and upload that cropped image. Review the sampled colors and manually correct them.
5. Print a proof and compare actual marker ink. Scanner/camera lighting and paper affect the result.

Example palette schema:

```json
{
  "name": "My measured marker collection",
  "paper": "140 gsm uncoated stock",
  "markers": [
    {
      "id": "my-marker-1",
      "name": "My green",
      "code": "ACTUAL-CODE",
      "hex": "#385B48",
      "enabled": true
    }
  ]
}
```

`code` is optional; only enter a manufacturer's code after verifying it. Importing normalizes entry IDs and enables all imported markers; individual exclusion is available afterward.

## Print and manufacturing files

The notebook ZIP contains:

1. `interior_print_ready.pdf`
2. `front_cover.pdf`
3. `back_cover_spec.pdf`
4. `protective_sheet_template.pdf`
5. `color_key.pdf`
6. `marker_swatch_calibration.pdf`
7. `colored_preview.pdf`
8. `manufacturing_guide.pdf`
9. `bill_of_materials.csv`
10. `project.json`

PDF points use 72 points per inch. The default is 360 × 504 points (5 × 7 inches). Optional 0.125-inch bleed adds 9 points per side and a PDF trim box. Artwork is intentionally kept in the safe area; bleed does not invent extended image content. These are RGB files with standard PDF Helvetica, not certified CMYK/separation files.

Print at **100% / actual size**. Use single-sided artwork, a proof-tested uncoated stock, rigid backing and a reusable PP/PET insert. Prototype defaults are 120–160 gsm interiors, approximately 1.5–2 mm board and 0.6-inch top binding clearance. Confirm hole pattern, punch capacity, binding diameter, stock, material thickness and any printer-specific requirements. Binding holes are not pre-cut or assumed to match a universal pitch. Print the protective instructions on paper unless your process explicitly supports plastic.

Costs are editable assumptions, not supplier quotes. Quantity changes the total estimate; it does not assume an unverified volume discount. Tax, shipping and spoilage are excluded.

## References and current limits

The four supplied HEIC references informed the top-bound format, light-gray staggered letters, compact color key, page-indexed notebook key, and moveable protective-sheet workflow. The reference photos remain local, ignored by Git, and are not bundled into the website. Their branding, marketing copy and QR codes are not reproduced.

This is a working first implementation, not a claim of parity with hand-illustrated commercial coloring books:

- Line art uses classical browser segmentation, not a generative illustration model. Noisy photographs, subtle facial features, shadows and busy backgrounds may require manual cleanup. Use higher output detail, fewer colors or larger minimum regions and inspect a proof.
- Region contours are simplified polygons with rounded stroke joins. There is no freehand Bézier boundary editor or semantic subject/background extraction. The background control uses border connectivity; review subjects touching the image edge.
- Region cleanup combines processing-cell limits with a user-entered minimum fill area in square millimeters. Long thin regions can still be awkward to color; label fitting conservatively uses physical scale. No precise marker-tip specification is assumed.
- Crop uses the fixed printable artwork aspect ratio. Move or resize the crop frame; paper margins allow movement beyond the photograph. The Original view shows the uncropped source with rotation, while the template uses the accepted crop.
- Processing uses a normalized image up to 2,000 pixels on the long edge, while the original binary (including its metadata) is retained separately in saved projects and JSON backups. Large uploads increase storage and backup size; browser storage quotas still apply. HEIC conversion is not bundled; export HEIC to JPEG/PNG before uploading to unsupported browsers.
- Calibration requires a flat, accurately cropped scan. Automatic chart detection and perspective correction remain future work.
- The cover is a custom text-title cover, not a full cover-layout designer. The backing PDF is a dimensioned specification; the protective PDF contains a full-size cut outline.
- Adaptive placement is a deterministic approximation, not a hand-illustrated reconstruction. Its sampling raster stays at your selected resolution; it can omit tiny color regions where physical marks cannot fit, and warns when that happens. Recoloring keeps positions fixed; changing mark sizes or sampling can change which source cells receive marks.
- Output detail is processed at the selected resolution; exports use the same vectors rather than a second, higher-detail segmentation that could invalidate manual edits.
- Local models are probabilistic: faces can be missed and categories can be wrong. A real rocket photo was classified as a drilling platform in verification. Hair preservation uses observed edges, not semantic hair segmentation. At low resolution and 4–8 colors, small faces can lose recognizable detail; inspect the comparison proof and crop closer when needed. Profile, glasses, varied-lighting and real group portraits still need validation.
- The service worker provides offline revisits after a complete online production load. Vision assets load lazily from the same origin and become available offline after successful use; an uncached model falls back to generic saliency offline. There is no install prompt or full PWA manifest. Browser eviction or private browsing can remove cached data.
- Browser tests cover Chromium. Safari/Firefox and physical paper/marker proofing still need real-device validation.

## Deployment to GitHub Pages

The application has no server routes, API keys, paid service, external runtime fonts or image-processing endpoints. Tabs are local UI state; refresh returns to Create instead of producing a deep-link 404. IndexedDB projects remain accessible through My Projects.

1. Create an empty GitHub repository, such as `PictureToDots`.
2. From this folder, commit the source and configure your repository remote. Keep the supplied reference photos private; `.gitignore` excludes `IMG_*.HEIC`.

   ```sh
   git add .
   git commit -m "Build browser-only coloring studio"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/PictureToDots.git
   git push -u origin main
   ```

3. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build source.
4. The included `.github/workflows/deploy.yml` installs dependencies, runs unit and browser tests, builds the app, and deploys `dist/` whenever `main` changes. Enable Actions for the repository if needed.
5. Open `https://YOUR-USERNAME.github.io/PictureToDots/` after the deployment succeeds.
6. Push future changes to `main` to redeploy. An existing open app can keep its previous cached version until all its tabs close; reopen after deployment to activate the new service worker.

Vite defaults to `base: './'`, so the same build supports a repository subpath and a domain root. An explicit base is optional:

```sh
VITE_BASE_PATH=/PictureToDots/ npm run build
```

For a custom domain:

1. Configure the custom domain in repository **Settings → Pages**.
2. Set the domain's DNS records according to GitHub's current [custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).
3. Optionally add `public/CNAME` containing the hostname (no protocol), then rebuild.
4. Retain the default relative base or use `/`; do not retain an explicit repository-only base when serving at a custom-domain root.
5. Enable HTTPS in Pages once DNS and certificate provisioning complete.

The repository remote is configured at [krissutantio/PictureToDots](https://github.com/krissutantio/PictureToDots), and the initial commit has been pushed. Public Pages deployment has not been verified in this chat.

## Source map

- `src/processing.ts`: color science, palette optimization, cleanup, connected components, contour tracing, simplification and print geometry.
- `src/processor.worker.ts`: isolated processing jobs; obsolete workers are terminated.
- `src/dots.ts`: deterministic adaptive positions, variable physical mark sizes, collision checks and coverage advisories.
- `src/crop.ts`, `src/CropEditor.tsx`, `src/input.ts`: reversible framing and source sampling.
- `src/analysis.ts`, `src/analysis.worker.ts`, `public/vision/`: saliency and self-hosted model inference in workers.
- `src/features.ts`, `src/ImportanceEditor.tsx`, `src/StrategyComparison.tsx`: importance edits, structure-aware conversion and comparison proofs.
- `src/main.tsx`: studio, project library, marker management, notebook and manufacturing interfaces.
- `src/render.ts`: shared artwork SVG and raster downloads.
- `src/export.ts`: vector PDFs, color keys, calibration, protective sheets and ZIP assembly.
- `src/storage.ts`: IndexedDB and project import validation.
- `src/samples.ts`: original procedural examples and browser image decoding.
- `scripts/service-worker.mjs`: production asset-cache generation.
- `tests/`: unit/integration and Playwright browser checks.

Photos and projects are processed locally. Model/SDK/WASM files are bundled under `public/vision/`; no CDN or inference endpoint is contacted at runtime. A restrictive CSP and worker fetch guard block outbound SDK telemetry. Real-photo Chromium tests observe zero external HTTP requests. The optional `npm run models:fetch` setup command downloads missing model files; existing files are reused. A purchase-link click navigates to the external retailer. Clearing browser site data can delete projects; export backups regularly.
