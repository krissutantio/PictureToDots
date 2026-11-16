import glyphs from "./reference-symbols.json" with { type: "json" };
import { letter, type Marker } from "./types";
const registry: Record<string, { name: string; path: string }> = glyphs;
export const markerLabel = (marker: Marker, index: number) =>
  marker.symbol && Object.hasOwn(registry, marker.symbol)
    ? marker.symbol
    : letter(index);
export const markerGlyph = (marker: Marker, index: number) =>
  registry[markerLabel(marker, index)];
export const symbolDescription = (marker: Marker, index: number) =>
  markerGlyph(marker, index)?.name.toLowerCase() || markerLabel(marker, index);
export const isSymbol = (value: unknown): value is string =>
  typeof value === "string" && Object.hasOwn(registry, value);
export const symbolCharacters = Object.keys(registry);
export function withSymbols(markers: Marker[]): Marker[] {
  if (markers.length > symbolCharacters.length)
    return markers.map(({ symbol, ...marker }) => marker);
  const used = new Set<string>();
  return markers.map((marker) => {
    const symbol =
      isSymbol(marker.symbol) && !used.has(marker.symbol)
        ? marker.symbol
        : symbolCharacters.find((s) => !used.has(s));
    if (symbol) used.add(symbol);
    return { ...marker, symbol };
  });
}
export const labelLength = (markers: Marker[]) =>
  Math.max(1, ...markers.map((m, i) => Array.from(markerLabel(m, i)).length));
export const labelFootprint = (markers: Marker[], font: number) =>
  font *
  Math.max(
    ...markers.map((m, i) =>
      markerGlyph(m, i)
        ? 0.78 * Math.SQRT2
        : Math.hypot(0.67 * markerLabel(m, i).length, 0.75),
    ),
    1,
  );
export const contrastInk = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 145 ? "#172c49" : "#ffffff";
};
export function glyphSVG(
  marker: Marker,
  index: number,
  x: number,
  y: number,
  font: number,
  fill: string,
) {
  const glyph = markerGlyph(marker, index),
    label = markerLabel(marker, index);
  if (glyph) {
    const size = font * 0.78;
    return `<path data-symbol="${label}" d="${glyph.path}" transform="translate(${x - size / 2},${y - size / 2}) scale(${size})" fill="${fill}"/>`;
  }
  return `<text x="${x}" y="${y + font * 0.34}" text-anchor="middle" font-size="${font}" fill="${fill}">${label}</text>`;
}
/** A color's matching identity; human-readable code/name/symbol edits never re-segment art. */
export const paletteIdentity = (markers: Marker[]) =>
  JSON.stringify(markers.map((m) => [m.id, m.hex, m.enabled]));
