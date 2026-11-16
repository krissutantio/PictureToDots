# Decisions worth preserving

- **No backend:** GitHub Pages is the intended host. No server image processing, user account or paid service.
- **Honest palette:** local demo swatches are not an invented Ohuhu color chart. Real identifiers/values come from user import or paper calibration.
- **Classical + local model pipeline:** retain Color Accuracy; add optional structure-aware strategies. Facial landmarks weight observed pixels, never generate canonical facial shapes.
- **No semantic hair claims:** face landmarks do not identify hairstyle/ears. Hair preservation uses an edge-supported silhouette band and user brush corrections.
- **Framing is reversible:** old 1× sliders could not move along a dimension already filled by the source. New explicit crop-center geometry permits white paper margins when panning beyond the image; users can disable margins to constrain the frame.
- **Review before conversion:** uploaded images get a suggested crop, but acceptance/rejection/manual adjustment belongs to the user. Subject confidence is not a likeness score.
- **Privacy isolation:** pinned MediaPipe 1.2.3 contains telemetry. Self-hosting alone is insufficient. Use a CSP-inheriting blob classic worker, same-origin fetch guard, local assets and outbound-network tests.
- **Shared boundaries:** contour simplification must pin junctions on both neighboring regions; dropping collinear junction points previously created gaps.
- **Manual edits survive:** presentation-only settings must not re-segment artwork or erase region merges. Reopened projects restore their saved art.
- **Physical truth:** PDF uses points, line/dot limits reflect real page geometry, narrow labels are omitted/flagged, RGB is not certified CMYK.
- **Deployment stays explicit:** `origin` is now `https://github.com/krissutantio/PictureToDots.git`; the initial commit was pushed with user approval. Deployment status has not been verified. Future publishing remains explicit.

- **Adaptive layout is opt-in:** irregular centers and variable sizes are deterministic packing from measured color/importance, with marker/letter collision checks. Legacy recoloring uses source cell IDs; v2 free marks have independent stable IDs, with source-cell compatibility for old edits. Recoloring does not regenerate positions. Resolution remains a sampling budget; skipped tiny regions are reported.
- **Full palette means eligibility:** new work has all 60 enabled starter colors available, with no requirement to force every color into an image. These are unverified demonstration swatches, not an official Maui chart. Old/custom palettes remain unchanged. Two-letter labels and paginated keys remove the old 26-color ceiling.

- **Home plus a bounded editor:** keep a compact shared top bar, with notebook creation/reopening on Home. One studio step opens at a time; the document does not scroll. Advanced settings, lists and zoomed artwork can scroll within their own panels.
- **Install as a web app:** relative manifest/icon URLs preserve Pages subpath hosting; Apple standalone metadata supports older Safari. Cache install assets, but leave model caching lazy. Chromium configuration checks do not prove an actual iOS Share-sheet installation.
- **Navy is chrome, not ink:** theme UI/navigation and install icons; never recolor the physical palette or exported art to match the theme.
