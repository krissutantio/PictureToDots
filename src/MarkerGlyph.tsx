import type { Marker } from "./types";
import { markerGlyph, markerLabel, symbolDescription } from "./symbols";
export function MarkerGlyph({
  marker,
  index,
}: {
  marker: Marker;
  index: number;
}) {
  const glyph = markerGlyph(marker, index),
    label = markerLabel(marker, index);
  return glyph ? (
    <svg
      data-symbol={label}
      className="marker-glyph"
      viewBox="0 0 1 1"
      role="img"
      aria-label={symbolDescription(marker, index)}
    >
      <path d={glyph.path} fill="currentColor" />
    </svg>
  ) : (
    <span>{label}</span>
  );
}
