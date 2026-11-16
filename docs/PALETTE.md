# Maui 60 marker codes and permanent symbols

## Source and accuracy

The user supplied a Target retailer color-chart screenshot on 2026-11-16 showing
60 numbered heart swatches. These numbers are transcribed in `src/palettes.json`.
RGB values are channel medians of small center patches in that screenshot. They
are **chart-image estimates, not calibrated ink measurements or official sRGB
specifications**. No color names have been invented: entries are named Maui plus
the printed marker number. Original reference images remain private and are not
bundled into the site.

All 60 entries are enabled and eligible by default. A color is keyed by its stable
`ohuhu-maui-{number}` ID; each receives one permanent `symbol` property. Image
palette selection and luminance sorting never renumber these symbols. One symbol
means one colored mark, regardless of its size. Legacy `AA`/`BA` identifiers were
single color codes, not instructions to draw two dots; the current set avoids
those two-character identifiers entirely.

Symbols include selected capitals, digits and geometric/pictorial characters.
Look-alike pairs I/1, O/0, B/8, S/5, Z/2 and G/6 are avoided. Single-digit physical markers use that same digit as their symbol; I, O, B, S, Z and G are not used as symbol letters. All symbols are drawn
from shared vector outlines for consistent browser/SVG/PNG/PDF output, rather
than relying on platform emoji or missing font glyphs. The symbol key still needs
physical proofing at the smallest permitted size.

## Studio and print use

- The colored swatch circle displays its actual marker number; its permanent
  symbol appears below. Both are available in the accessible name/tooltip.
- Select a swatch to view or edit its number directly in the studio. Metadata
  edits preserve matching, positions, manual recoloring and undo/redo history.
- Top-of-page keys show marker numbers up to three characters inside the swatch;
  full identifiers are included in the paginated color key. Calibration sheets
  show the physical code and permanent symbol.
- Unknown imported codes display `?`; they are never replaced with invented
  manufacturer numbers. Custom palettes of up to 60 markers receive one-character
  symbols on import. Larger custom collections retain legacy code compatibility.
- Untouched legacy demo preferences migrate to this chart palette. Customized
  palettes and saved projects are preserved. Use **Load Maui 60 chart palette**
  explicitly to replace an older project's colors, or **Use single-character
  symbols** to add symbols to a smaller existing collection without changing ink
  colors. Replacing actual colors can require reprocessing; metadata edits do not.

## Vector symbol resources

`src/reference-symbols.json` contains a small vector outline subset derived from
DejaVu Sans. The font license is at `public/licenses/ReferenceSymbols.txt`.
`scripts/generate-symbols.py` regenerates the subset from a local font file with
fontTools; production needs neither that tool nor a font service. Existing v1/v2
layout coordinates remain versioned; new v3 reference spacing reserves readable
symbol footprints and whitespace.

## Permanent mapping

| Marker number | Symbol | Chart RGB estimate |
| ------------- | ------ | ------------------ |
| 1             | 1      | `#ab2628`          |
| 2             | 2      | `#b0272b`          |
| 3             | 3      | `#c22f2e`          |
| 4             | 4      | `#c1376b`          |
| 6             | 6      | `#d356b7`          |
| 7             | 7      | `#e2414e`          |
| 8             | 8      | `#efa2af`          |
| 9             | 9      | `#ec7fb4`          |
| 11            | A      | `#e8548a`          |
| 15            | C      | `#e25bad`          |
| 17            | D      | `#6c1b35`          |
| 18            | E      | `#4b5f71`          |
| 20            | F      | `#3e4759`          |
| 23            | H      | `#3e5876`          |
| 24            | J      | `#ed8252`          |
| 27            | K      | `#eea878`          |
| 28            | L      | `#eb8645`          |
| 29            | M      | `#e5b54b`          |
| 30            | N      | `#ebc664`          |
| 31            | P      | `#f3b941`          |
| 32            | R      | `#f3dd50`          |
| 33            | T      | `#f7db4a`          |
| 35            | U      | `#44331e`          |
| 38            | V      | `#faea53`          |
| 39            | W      | `#ea6a38`          |
| 40            | X      | `#ed9f3c`          |
| 41            | Y      | `#ee983a`          |
| 42            | ★      | `#ea7236`          |
| 45            | ◆      | `#453539`          |
| 46            | ▲      | `#47231c`          |
| 48            | ▼      | `#331b15`          |
| 49            | ◀      | `#ad45c5`          |
| 50            | ▶      | `#8947d1`          |
| 51            | ●      | `#3a26ab`          |
| 52            | ■      | `#7d6af2`          |
| 53            | ✚      | `#d251b5`          |
| 54            | ♥      | `#4327ae`          |
| 56            | ♠      | `#2c24ab`          |
| 58            | ♣      | `#d0449b`          |
| 60            | ☀      | `#398188`          |
| 61            | ☁      | `#2d5926`          |
| 62            | ☂      | `#54a646`          |
| 63            | ⚑      | `#1c4232`          |
| 64            | ⚓     | `#2a6258`          |
| 66            | ♪      | `#377c44`          |
| 67            | ✿      | `#327232`          |
| 70            | ❄      | `#97f489`          |
| 72            | ⌘      | `#78bc3d`          |
| 73            | ⌂      | `#93c33d`          |
| 75            | ↑      | `#469a88`          |
| 76            | ↓      | `#265bdb`          |
| 81            | ←      | `#2c6597`          |
| 82            | →      | `#66bef8`          |
| 83            | ↗      | `#1130b3`          |
| 85            | ↙      | `#3b86ee`          |
| 87            | ⊕      | `#61acf6`          |
| 88            | ⊗      | `#275ddd`          |
| 93            | ∞      | `#090c0f`          |
| 99            | π      | `#283615`          |
| 100           | Ω      | `#44969b`          |
