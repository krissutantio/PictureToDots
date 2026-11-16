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
- **Deployment stays explicit:** no Git remote exists yet. Shipping a Pages workflow is not the same as a successful public deployment.
