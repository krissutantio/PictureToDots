# Adaptive letter layout

## Request and design

Offer a reference-inspired dot layout with irregular positions and variable-size
letters/marks. This is an explicit layout choice, independent of conversion
priority and difficulty. Keep regular/staggered grids available and migrate old
projects to regular layout. New projects retain their existing layout until the
user chooses adaptive placement.

Use deterministic spatial packing on the accepted crop's measured color field:
smaller marks near color boundaries and high-importance detail; larger marks in
flat areas. Candidate centers do not form rows. Do not synthesize facial shapes.
Each mark refers to one source processing cell so existing recoloring/undo and
backups remain meaningful. Derive geometry from saved, unedited artwork so a
recolor does not move the page. Identical input/settings reproduce the layout.

Share the same geometry across preview, SVG, PNG, PDF, comparisons and notebook
exports. Respect explicit minimum/maximum mark diameters, label legibility,
non-overlap and page-safe bounds. Warn/block impossible physical settings rather
than silently shrinking marks or changing input resolution. Sampling resolution
remains the underlying detail budget, not a promise of one mark per cell.

## Palette follow-up

New work defaults to a 60-color budget and all enabled swatches are eligible;
less complex images need not use every color. Support unique A–Z, AA–BH labels,
wrapped page legends and paginated color keys. Older projects keep their stored
color limits and palettes. Difficulty presets remain explicit smaller limits.

The selected product is Ohuhu Maui 60, water-based brush/fineliner. The official
product page confirms the set, but a complete official code-to-color chart has
not been verified. Any bundled 60-color starter collection must remain explicitly
unverified demonstration colors, with no invented manufacturer codes. Physical
matching still requires the actual set chart or calibration scan.

## Acceptance

- Deterministic irregular centers, multiple sizes, no overlapping mark/label
  footprints, safe bounds and minimum/maximum physical size checks.
- Smaller marks near measured detail; no invisible edits or changing positions
  during recoloring, save/reopen, JSON round trips or presentation changes.
- 60 valid enabled swatches; full-set matching excludes disabled entries; unique
  two-letter keys; readable multipage keys and calibration charts.
- Browser coverage for switching layouts, edits, backups, all exports and both
  regular and adaptive print proofs; unit tests, build and full browser suite.

## Implemented verification

Completed: shared deterministic packing, coverage advisories, 60-color eligibility,
physical blockers, wrapped/paginated keys, backup/edit stability and safe legacy
preference migration. See [TESTING](TESTING.md) for the 28-unit/14-browser results
and print-proof review. The official palette mapping remains unresolved.

## Continuous placement revision (v2)

The first adaptive algorithm jittered one candidate inside each processing cell.
Version 2 removes that constraint: deterministic continuous coordinates sample the
whole artwork area; variable-radius packing accepts multiple marks per raster
cell. Each free mark gets a stable ID distinct from its underlying source cell,
so repainting one letter does not repaint another letter in that same cell.

Dot workers retain an additional high-resolution measured color/importance field
(`Artwork.dotField`). The palette is the same enabled subset used by the artwork;
feature preprocessing supplies measured fine detail, never synthesized anatomy.
Size/density follow observed boundaries and importance. Physical diameter,
letter footprint, non-overlap and safe-area constraints still apply. Coverage
advisories count unrepresented regions in the high-resolution field.

`Settings.dotLayoutVersion` defaults to 2 for new work. A saved adaptive project
without that field migrates to version 1, preserving its previous coordinates and
source-cell edits. The explicit Upgrade to free placement action opts into v2.
Do not change v1 geometry or silently reinterpret v2 stable IDs in future edits.
Regular-grid projects remain regular. Changing the minimum/maximum sizes can
change which free candidates fit; edits remain stored and return with that layout.

Preview, SVG, PNG, PDF, comparisons and notebook output consume the same marks.
A `dotField` is optional for older backups and strictly validated on import.
Higher-resolution fields add backup/storage cost, so quota failures must remain
visible and buffers must stay bounded.
