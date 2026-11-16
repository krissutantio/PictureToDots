# Future feature: illustrated contour and hatching line art

Status: **backlog / not implemented**. The current segmented line-art mode stays
available; this reference does not request replacing it in the present release.

## Reference supplied 2026-11-16

The user supplied an illustration of a shaggy dog centered in a pickup-truck bed,
with a bucket of flowers to the left, pumpkins to the right and autumn leaves
around the border. Warm paper remains visible between marks. Vehicle outlines
use blue/teal strokes; pumpkins/leaves use orange and green; fur and structural
lines use darker brown/black strokes. No letter labels are visible in the crop.

Its defining features are deliberate **contour-following strokes and hatching**:

- Short curved marks follow the dog's fur and facial structure.
- Parallel hatching changes direction with surfaces and object contours.
- Flowers, foliage and pumpkin ribs are described by economical curved lines.
- Stroke length, spacing, direction, density and weight create texture/shading.
- Larger object silhouettes remain coherent; whitespace separates nearby forms.
- It reads as an illustrated scene, rather than uniformly filled polygon cells.

The image is a visual target, not evidence of an automatic reconstruction method
or guaranteed photographic likeness. The original remains a private conversation
attachment and is not copied into the public site or test fixtures.

## Future implementation work

1. Investigate measured edge/contour fields, local orientation and region-aware
   hatch paths. Preserve observed features; do not fabricate facial anatomy.
2. Add an explicit illustrated-hatching mode beside the existing dot/segmented
   modes. Keep reversible source edits, existing projects and manual corrections.
3. Use only enabled physical palette colors; distinguish color selection from
   line-direction/texture generation. Any code/key convention needs review.
4. Define physical minimum stroke widths, stroke spacing and closed/exportable
   vector paths; retain SVG/PDF and consistent on-screen/print geometry.
5. Compare real-photo portraits, animals, plants and mechanical structures at
   actual print scale. Check legibility, path crossings, clutter and color counts.
6. Remain static/browser-local. No paid inference, server uploads or API keys.

Acceptance requires rendered examples showing coherent silhouettes, intentional
texture direction, readable whitespace and physically reproducible strokes.
A numerical edge score alone cannot establish illustrated quality or likeness.
