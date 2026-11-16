# Decisions worth preserving

- **No backend:** GitHub Pages is the intended host. No server image processing, user account or paid service.
- **Honest palette:** the supplied retailer chart provides all 60 printed marker numbers. RGB is explicitly a sampled chart estimate, not calibrated physical ink or official manufacturer sRGB. Legacy demo data is migration-only.
- **Classical + local model pipeline:** retain Color Accuracy; add optional structure-aware strategies. Facial landmarks weight observed pixels, never generate canonical facial shapes.
- **No semantic hair claims:** face landmarks do not identify hairstyle/ears. Hair preservation uses an edge-supported silhouette band and user brush corrections.
- **Framing is reversible:** old 1× sliders could not move along a dimension already filled by the source. New explicit crop-center geometry permits white paper margins when panning beyond the image; users can disable margins to constrain the frame.
- **Review before conversion:** uploaded images get a suggested crop, but acceptance/rejection/manual adjustment belongs to the user. Subject confidence is not a likeness score.
- **Privacy isolation:** pinned MediaPipe 1.2.3 contains telemetry. Self-hosting alone is insufficient. Use a CSP-inheriting blob classic worker, same-origin fetch guard, local assets and outbound-network tests.
- **Shared boundaries:** contour simplification must pin junctions on both neighboring regions; dropping collinear junction points previously created gaps.
- **Manual edits survive:** presentation-only settings must not re-segment artwork or erase region merges. Reopened projects restore their saved art.
- **Physical truth:** PDF uses points, line/dot limits reflect real page geometry, narrow labels are omitted/flagged, RGB is not certified CMYK.
- **Deployment stays explicit:** `origin` is `https://github.com/krissutantio/PictureToDots.git`; release `8ca9812` was pushed/deployed with user approval and verified live. Future publishing remains explicit.

- **Adaptive defaults on for fresh projects:** v3 reference spacing is the current default; existing projects retain their saved layout. Irregular centers and variable sizes are deterministic packing from measured color/importance, with marker/letter collision checks. Legacy recoloring uses source cell IDs; v2/v3 free marks have independent stable IDs, with source-cell compatibility for old edits. Recoloring does not regenerate positions. Resolution remains a sampling budget; skipped tiny regions are reported.
- **Full palette means eligibility:** new work has all 60 enabled starter colors available, with no requirement to force every color into an image. The active defaults are numbered chart estimates. Old/custom palettes remain unchanged until an explicit palette change. Permanent one-character vector symbols remove the need for ambiguous two-letter identifiers; old backups retain compatibility.

- **Home plus a bounded editor:** keep a compact shared top bar, with notebook creation/reopening on Home. One studio step opens at a time; the document does not scroll. Advanced settings, lists and zoomed artwork can scroll within their own panels.
- **Install as a web app:** relative manifest/icon URLs preserve Pages subpath hosting; Apple standalone metadata supports older Safari. Cache install assets, but leave model caching lazy. Chromium configuration checks do not prove an actual iOS Share-sheet installation.
- **Navy is chrome, not ink:** theme UI/navigation and install icons; never recolor the physical palette or exported art to match the theme.

- **Reference spacing (v3):** larger candidates are placed first and label footprints receive explicit whitespace. New pages use the reference layout rather than opening on the regular grid. Existing v1/v2 layouts and physical sizes are preserved until chosen otherwise.
- **Permanent symbols:** marker IDs own their symbol; selected-palette order never chooses it. Single-digit physical codes use their own digit. Shared licensed vector outlines keep pictorial characters consistent in SVG/PNG/PDF without font services. Code/name edits are metadata and preserve matching, recoloring, geometry and history.
- **Deferred illustrated line art:** document the supplied dog/truck hatching reference in [LINE_ART_REFERENCE](LINE_ART_REFERENCE.md); retain current segmentation for now, per the user.
- **Portrait simplification is opt-in:** use measured local contrast to reserve physical marks before filling smoother areas. The optional `portraitV1` map distinguishes geometry from ordinary v3. Compare with Maximum Recognizability at matched settings; visual acceptance remains separate from mechanical checks. See [PORTRAIT_SIMPLIFICATION](PORTRAIT_SIMPLIFICATION.md).
