# Portrait detail feedback loop — 2026-11-17

## Selected method

The director and three Sol agents compared placement alternatives against the
previous `portraitV2` output. The selected `portraitV3` keeps the same observed
color/evidence input and adds candidates at measured contrast ridges that continue
along their tangent. These subpixel candidates compete with the existing random
candidates; they do not draw landmark outlines or fill hidden features.

Two supported minimum-size feature dots may now have **0.45 mm of whitespace**
between their conservative mark/symbol footprints. The previous reference rule
added about 1.12 mm for a 2 mm dot. That extra whitespace was a design choice,
not a marker diameter constraint. Ordinary marks retain reference spacing.
Physical min/max diameter, paper boundaries, symbol footprints, palette eligibility,
resolution, accepted crop and paper cutouts remain enforced.

## Alternatives tested

| Experiment                                             | Finding / decision                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Ridge candidates alone                                 | Some feature alignment improves, but much detail still loses room to the reference whitespace.                |
| Tighter supported-detail spacing alone                 | Strong improvement in eye/frame coverage, with a modest number of extra dots.                                 |
| Ridge candidates plus tighter spacing                  | Selected: glasses loops and eye-line placement read better than spacing alone at almost identical dot counts. |
| Three times as many random candidates                  | Roughly three times the placement cost, no consistent detail improvement. Rejected.                           |
| 15% disk support instead of 25%, evidence-only ranking | Little useful improvement in the matched proofs. Kept the existing support rule.                              |
| 0.60 / 0.80 mm detail gaps                             | Some improvement, but lower glasses/eye contrast coverage than 0.45 mm.                                       |
| Weaker coherent ridges (evidence above 0.11)           | Adds a few dots, but nose improvement is not clear and local clutter changes. Not promoted.                   |

The closer glasses 12-color proof has 618 dots for both spacing-only and combined
placement. Their measured eye-band contrast hits are 345 and 398 respectively,
versus 250 for V2. This diagnostic counts observed evidence represented by matching
contrast; it is **not a likeness score**. Visual comparison supports better frame
and eye organization. Extra density alone does not explain the whole difference.

## Matched final proofs

All rows retain each source crop exactly: 5 × 7 in, 60 sampling columns,
2–3.2 mm dots, adaptive reference layout and enabled chart-estimated inks.
The 60-color legend leaves less artwork area, so compare within a row.

| Photo / crop           | 12-color dots: V2 → V3 | 60-color dots: V2 → V3 |
| ---------------------- | ---------------------- | ---------------------- |
| Photo Booth / centered | 633 → 643              | 477 → 487              |
| Photo Booth / closer   | 706 → 732              | 566 → 589              |
| Glasses / centered     | 485 → 504              | 361 → 373              |
| Glasses / closer       | 576 → 618              | 437 → 465              |

Closer proofs improve eye/brow structure and glasses loops, with small lip gains.
Nose detail remains weak; upper frames and eyelashes can still crowd together.
The centered Photo Booth crop already clips one eye, and some eye-coverage metrics
regress there. This is not a universal improvement or permission to complete
cropped anatomy. User visual acceptance and physical ink proofs remain pending.

The public astronaut adds useful eye detail but does not resolve every facial
feature. The Chelsea cat control has exactly the same output: 584 dots at 12 colors
and 453 at 60. The 14-case final harness reported zero external requests and checked
sampled source equality, enabled palette membership, size/bounds/footprint gaps,
backup geometry and preserved original V2 positions. Private files remain ignored
or outside the repo; originals and proofs are never deployed.

## Compatibility and performance

- `portraitV3` is an optional validated field with the existing evidence/tone-area
  shape. Old V1 and V2 output retains exact geometry; new geometry is explicit.
- Ridge IDs occupy a fixed namespace above all random candidates. Changing physical
  size cannot make a saved ridge edit target a different random dot. Recoloring,
  backup round trips and common IDs across size changes were checked independently.
- V1/V2 projects use the existing review/apply flow. V2 upgrades are offered only for
  reference adaptive placement, where this revision changes output. Undo/Redo keeps
  the previous artwork and edits.
- Hoisting the invariant glyph footprint and using bounded numeric buckets preserves
  old geometry and reduces repeated work. Final private cases placed V3 marks in
  about 40–66 ms on this host, versus about 110–190 ms for the captured V2 implementation;
  processing was about 108–151 ms. These are host observations, not a device guarantee.
- Independent synthetic stress checks included 100-column large pages, a 750×1056
  imported evidence field, 0.5 mm dots and legacy two-character labels. Actual
  footprints/paper cutouts, source ink centers, stable IDs and backup edits passed.
  The largest imported-field case took about 394–413 ms for placement.

## Verification

See [TESTING](TESTING.md) for final unit/build/browser results. Two final symbol PDFs
(closer glasses at 12 colors and Photo Booth at 60) were rendered with Poppler and
visually inspected: no overlapping or clipped symbols. Screen/PDF inspection does
not establish actual marker pressure, ink spread or paper readability.
