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
