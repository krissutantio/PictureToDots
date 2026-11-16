# Home library and fixed workspace

## Navigation and notebooks

The app starts at Home, which lists locally saved notebooks. Create notebook
opens a new independent notebook; Edit notebook restores its pages and settings.
New page opens the studio with the current marker collection and target notebook.
The compact top bar is reused across Home, the studio, projects, marker sets,
notebook assembly and manufacturing. There is no server route or account.

Notebook metadata and pages live in the IndexedDB `preferences` store:
`notebooks` is a list of `{id, updated, notebook}`, `activeNotebook` identifies the
last notebook, and `notebook` remains a compatibility snapshot. An existing lone
notebook preference migrates into the library without deleting it. Autosaving
notebook settings/pages does not replace the separate Save project/JSON backup
workflow for an individual page. Importing a notebook creates a new library entry.

## Studio flow

- Entering a new page opens step 1 (Your photograph); other steps are collapsed.
- Upload opens crop review. Accept or Keep current crop opens step 2 (Style &
  detail), including on small screens. Samples can also advance to step 2.
- Step 3 contains advanced image and physical page controls. Any step can be
  reopened; collapsing a step never resets its values.
- The document stays within `100dvh`; the print page fits via ResizeObserver.
  Desktop preview/export controls remain visible. Long settings, palettes and
  gallery lists scroll **inside** bounded panels; zoom deliberately enables pan.
- Small screens expose Steps, Preview, and Colors & export panels. Controls are
  not squeezed beside a tiny canvas; the selected panel overlays the preview.
  Safe-area insets account for standalone iOS screens.

The fit percentage is a screen-view multiplier, not a claim of actual physical
screen inches. PDFs still use points; print at 100%/actual size.

## Verification

`workspace.spec.ts` covers notebook creation/reopening across reload, crop-driven
step progression, a fitted paper and no page overflow at desktop/tablet sizes,
and mobile panel reachability. `production.spec.ts` covers the repository subpath,
offline Home/studio launch and installed-app resources. Actual iOS installation,
keyboard behavior, Safari rendering and physical proofs remain device checks.

## Navy theme

The shared shell uses navy `#173251` with pale blue surfaces, slate text and
high-contrast navigation. Home Screen icons and manifest theme colors use the
same navy. Theme changes apply to application chrome only: physical palette
swatches, source photos, artwork colors and printable gray letters retain their
content colors. Warning/subject accents remain distinct from the navigation.
