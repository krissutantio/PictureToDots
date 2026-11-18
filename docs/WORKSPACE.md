# Home library and fixed workspace

## Navigation and notebooks

The app starts at Home, which lists locally saved notebooks. Create notebook
opens a new independent notebook. Edit notebook restores its pages and settings.
Delete on a notebook card asks for confirmation before removing that notebook and
its page copies from this device. Separately saved projects stay in My Projects.
New page opens the studio with the current marker collection and target notebook.
If the active notebook is deleted, the most recently opened or edited remaining
notebook becomes active. After the final notebook is deleted, adding a studio
page or changing settings in Notebook Builder starts a new notebook.
The compact top bar is reused across Home, the studio, projects, marker sets,
notebook assembly and manufacturing. There is no server route or account.

Notebook metadata and pages live in the IndexedDB `preferences` store:
`notebooks` is an ordered list of `{id, updated, notebook}`, `activeNotebook`
identifies the active notebook at the front of the list, and `notebook` remains a
compatibility snapshot. These preferences update in one transaction. An existing
lone notebook preference migrates into the library when the list is absent.
Deleting the last notebook keeps an empty list and clears the active ID and
snapshot. Edits from another tab cannot restore a deleted entry. Use Save
project or JSON backup to retain an individual page separately from its
notebook. Importing a notebook creates a new library entry.

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

`workspace.spec.ts` covers notebook creation and deletion across reloads,
cancellation, legacy migration, stale-tab edits, preserved standalone projects,
crop-driven step progression, a fitted paper without document overflow at
desktop/tablet sizes, and mobile panel reachability. `production.spec.ts` covers the repository subpath,
offline Home/studio launch and installed-app resources. Actual iOS installation,
keyboard behavior, Safari rendering and physical proofs remain device checks.

## Navy theme

The shared shell uses navy `#173251` with pale blue surfaces, slate text and
high-contrast navigation. Home Screen icons and manifest theme colors use the
same navy. Theme changes apply to application chrome only: physical palette
swatches, source photos, artwork colors and printable gray letters retain their
content colors. Warning/subject accents remain distinct from the navigation.

## Future visual polish

[UI_DESIGN_NOTES](UI_DESIGN_NOTES.md) assesses the user's ten design suggestions.
Nested corner radii, subtle panel borders and matched icon weight are useful
polish candidates; dynamic viewport sizing is already part of this workspace.
Other effects are optional, deferred or limited to decoration. This is a design
review only; no new theme or animation behavior has been implemented.
