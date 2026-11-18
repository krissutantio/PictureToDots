# Subject silhouette

Choose **Conversion priority → Subject Silhouette** for quieter pale backgrounds,
simpler detected face tones and better handling of white paper. It is explicit:
existing priorities, saved artwork, sampling resolution, color budget and physical
marker sizes remain unchanged. Strategies and its PDF compare Color Accuracy,
Feature Preservation and Subject Silhouette.

With **Leave white paper uncolored** enabled, connected neutral background pixels
can become paper instead of being forced into pink/tan chart inks. Background
simplification controls how far the estimate reaches into shaded neutral tones.
The estimate grows from the top and sides, stops at measured color/gradient
boundaries, and respects protected importance marks. Bottom-only seeding is
excluded because cropped clothing commonly touches that edge. Importance painting
can protect connected pale areas from the background estimate; very bright
foreground pixels can still classify as white paper during ink matching.

Detected face boxes locate measured skin-like colors, which are consolidated to a
median tone before matching to enabled inks. Hair and dark features remain source
pixels; the code draws no face oval, eyes or other invented anatomy. This favors
broad color areas over small tonal variations. White classification and neutral-ink
matching additionally avoid unnecessarily saturated substitutions in Dot Art.
Line Art receives the same simplified pixels through its existing segmentation.
Unchecking the white-paper option retains ink assignments under Keep background.

## Verification and limits

The private comparison uses the 300 × 345 source panel extracted from the supplied
screenshot, not the original photo. Both faces were detected. Matched 5 × 7 in,
60-column, 12-color proofs retain the same 2–3.2 mm dot limits. The first trial
cleared the left wall but left the shaded wall orange. A wider neutral range
cleared both; a measured gradient barrier and removal of bottom seeds recovered
some clothing/shadow marks lost by that trial. The final output is substantially
quieter, but white clothing still has a weak silhouette and small facial details
remain sparse. Stronger neutral matching made the garment marks more coherent,
but the current chart lacks pale gray: some pale gray shadows map to much darker
Maui 45. This is a deliberate silhouette/color-accuracy tradeoff, not corrected
ink calibration. A matched public astronaut proof also shows a quieter pale wall
and simplified face, with colored background objects still present. This is not a complete solution to white-on-white subject outlines.

The background estimate is **not semantic segmentation**. It chiefly addresses
pale/neutral connected backgrounds; colored clutter can remain, and pale objects
can still be mistaken for background. A protective brush or a closer accepted
crop may help. Face-tone selection is heuristic and can miss skin under unusual
lighting or include similarly colored pixels inside a face box. No guaranteed
likeness or calibrated ink accuracy is claimed. Physical marker/paper review and
Safari/Firefox checks remain manual.

Private proof files are kept outside tracked source. Unit tests cover paper/ink
matching, legacy behavior, connected/protected regions and rotated face tones.
Browser coverage checks comparison/export, unchanged budgets, original bytes and
saved geometry across reloads. See [TESTING](TESTING.md) and [HANDOFF](HANDOFF.md)
for final check results.
