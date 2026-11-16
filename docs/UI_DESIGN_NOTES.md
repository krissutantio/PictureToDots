# UI design considerations

Status: **reviewed suggestions, not an implementation task** (2026-11-16).
The user supplied a screenshot listing ten techniques and asked to consider
applicable choices. This records their relevance to the existing navy studio;
it records UI polish independently of the portrait implementation.
The screenshot is not bundled into the repository.

## Applicability

| Technique from reference | Decision                         | Application and constraints                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concentric radius        | Useful polish                    | Make nested cards, panels and inset controls share visually consistent corner spacing. Derive the inner radius from the outer radius and inset where appropriate; do not assign the same radius to every nested surface. Preserve round marker swatches and square paper geometry. |
| Alpha borders            | Useful polish                    | Consider subtle translucent navy/slate separators on known panel backgrounds. Check their composited contrast on every supported surface; active controls and focus indicators must stay clearly visible.                                                                          |
| OKLCH palettes           | Optional theme tooling           | Can organize UI surface, text and accent tokens around controlled lightness/chroma. Keep fallback colors and inspect contrast. Never regenerate physical marker colors, alter CIELAB matching, or recolor artwork as part of a theme change.                                       |
| OKLCH gradients          | Low priority                     | Consider only for restrained decorative Home surfaces if useful. Flat studio panels support color judgment; gradients add no value to marker swatches, source photos or print pages. Do not add them merely to use the technique.                                                  |
| Matched icon weight      | Useful polish                    | Audit existing Lucide icon sizes/stroke weights against adjacent labels, especially compact navigation, step toggles and exports. Reuse the current icon system. Permanent artwork glyphs are separate from UI icons and keep their established shapes.                            |
| Masked edges             | Conditional                      | A subtle fade might hint that a long palette/settings panel scrolls. Do not mask controls, numbers, focus rings or artwork; an ordinary scroll cue may be clearer. Verify first/last items remain fully reachable and readable.                                                    |
| Blurred icon swaps       | Defer                            | Adds motion without helping the main coloring workflow. If ever used, keep state changes immediate and accessible, honor reduced motion, and avoid blur on marker symbols or numbers.                                                                                              |
| Dark mode depth          | Future only                      | The navy theme is currently a light-surface UI, not a complete dark mode. If dark mode is requested, define distinct background/panel/raised surfaces and contrast deliberately. Keep paper white and color-reference surfaces stable so swatches remain meaningful.               |
| Dynamic viewport         | Already applicable               | The shell already uses `100dvh`, internal panel scrolling and safe-area insets. Preserve this; test Safari browser-bar changes, rotation, standalone mode and the software keyboard before assuming the page-fit problem is solved on iOS.                                         |
| Multiply blending        | Restricted decorative experiment | Could be explored for a paper/binding shadow on decorative UI. Keep it isolated from source images, marker swatches, artwork marks and exported files. It is not a calibrated simulation of ink overlap; do not use it to imply physical marker accuracy.                          |

## Priority and guardrails

Portrait recognizability remains the highest functional priority; see
[PORTRAIT_SIMPLIFICATION](PORTRAIT_SIMPLIFICATION.md). These visual ideas must not
delay matched portrait proofs or replace work on facial structure.

When UI polish is authorized, start with icon weight and nested radii, then panel
separators. Treat viewport behavior as a usability requirement to preserve and
verify, not a new cosmetic feature. OKLCH tokens are optional if they simplify
theme maintenance; avoid a broad CSS rewrite just to adopt a color syntax.

Keep theme changes confined to application chrome. Preserve physical palette
membership, permanent symbols/numbers, original bytes, artwork geometry and
saved-project behavior. No decorative effect should change generated outputs.

## Verification for any later implementation

- Compare Home and studio screenshots at current desktop/tablet/mobile sizes.
  Keep the document fitted, with purposeful internal scrolling and reachable
  preview/export controls; don't hide overflow to conceal inaccessible content.
- Verify focus visibility, keyboard operation, selected/disabled states, text
  contrast and reduced-motion behavior. Check translucent effects against the
  actual background, including forced-colors behavior where relevant.
- Check real iOS Safari and Home Screen mode with browser bars, safe areas,
  orientation changes and keyboard open. Automated Chromium viewport tests do
  not establish those behaviors.
- Confirm marker swatches, symbol readability, source/colored previews and
  vector/raster exports are unchanged by theme-only changes. Reuse the affected
  workspace and production browser checks; document device-only limits.

See [WORKSPACE](WORKSPACE.md) for existing layout/theme contracts and
[INSTALL](INSTALL.md) for standalone app behavior.
