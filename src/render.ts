import { glyphSVG, contrastInk } from "./symbols";
import { dotMarks } from "./dots";
import { geometry, labelFits, topLegend } from "./processing";
import { letter, type Artwork, type Project } from "./types";
export const escapeXML = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function editedArt(p: Project): Artwork | undefined {
  if (!p.art) return;
  return {
    ...p.art,
    palette: p.art.palette.map((m) => {
      const current = p.palette.markers.find((v) => v.id === m.id);
      return current
        ? {
            ...m,
            name: current.name,
            code: current.code,
            symbol: current.symbol,
          }
        : m;
    }),
    assignments: p.art.assignments.map((v, i) =>
      p.settings.mode === "dots" ? (p.edits[i] ?? v) : v,
    ),
    regions: p.art.regions.map((r) => ({
      ...r,
      color: p.edits[r.id] ?? r.color,
    })),
  };
}
export function artworkSVG(
  p: Project,
  colored = false,
  outlinesOnly = false,
  pageNumber?: number,
): string {
  const a = editedArt(p);
  if (!a) return "";
  const s = p.settings,
    g = geometry(s, a.width, a.height);
  let body = `<rect width="${g.width}" height="${g.height}" fill="white"/><text x="${s.margin * 72}" y="${s.binding * 72 + 14}" font-size="8" fill="#49534c">${escapeXML(p.title.slice(0, 65))}${pageNumber ? ` · ${pageNumber}` : ""}</text>`;
  const legend = topLegend(a.palette, g.width, s.margin * 72);
  const keyY = (s.margin + s.binding) * 72 + 15;
  if (s.mode === "dots" || s.lineLabels) {
    legend.forEach((group) => {
      const rowY = keyY + group.yOffset;
      body += `<text x="${group.x}" y="${rowY}" font-size="4" fill="#8b9189">${group.label}</text>`;
      group.entries.forEach(({ index: i, x }) => {
        const m = a.palette[i];
        body += `<circle cx="${x + 3}" cy="${rowY - 2}" r="3.5" fill="${colored ? m.hex : "white"}" stroke="#9caaa1" stroke-width=".4"/>${glyphSVG(m, i, x + 11.5, rowY - 2, 5, "#6a736e")}`;
        if (m.code && m.code.length <= 3)
          body += `<text x="${x + 3}" y="${rowY - 0.9}" font-size="3.2" text-anchor="middle" fill="${colored ? contrastInk(m.hex) : "#49534c"}">${escapeXML(m.code)}</text>`;
      });
    });
  }
  if (a.mode === "dots") {
    dotMarks(p.art!, s, g).forEach(
      ({ id: i, cell, color: measured, x, y, diameter, font }) => {
        const color =
          p.edits[i] ?? p.edits[cell] ?? measured ?? a.assignments[cell];
        body += `<g data-cell="${i}" data-mark-size="${diameter}"><circle cx="${x}" cy="${y}" r="${diameter / 2}" fill="${colored ? (color >= 0 ? a.palette[color].hex : "white") : "white"}" stroke="${colored || color < 0 ? "none" : s.guide === "circles" ? "#bcc1ba" : "none"}" stroke-width=".35"/>`;
        if (!colored && s.labels && color >= 0)
          body += glyphSVG(a.palette[color], color, x, y, font, "#8b9189");
        body += "</g>";
      },
    );
  } else {
    a.regions.forEach((r) => {
      body += `<g data-region="${r.id}"><path d="${r.paths.join(" ")}" transform="translate(${g.left},${g.top}) scale(${g.pitch})" fill="${colored && r.color >= 0 ? a.palette[r.color].hex : "white"}" fill-rule="evenodd" stroke="${s.background === "remove" && r.color < 0 ? "none" : "#303831"}" stroke-width="${s.thickness / g.pitch}" stroke-linejoin="round"/>`;
      if (
        !colored &&
        !outlinesOnly &&
        s.lineLabels &&
        r.color >= 0 &&
        labelFits(r, s, g.pitch)
      )
        body += glyphSVG(
          a.palette[r.color],
          r.color,
          g.left + r.label[0] * g.pitch,
          g.top + r.label[1] * g.pitch,
          5,
          "#72786f",
        );
      body += "</g>";
    });
  }
  body += `<text x="${g.width / 2}" y="${g.height - 12}" text-anchor="middle" font-size="5" fill="#91998f">PAPER &amp; PIGMENT · ${s.width} × ${s.height} in · Print at 100%</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width}in" height="${s.height}in" viewBox="0 0 ${g.width} ${g.height}" font-family="Arial, sans-serif">${body}</svg>`;
}
export function download(
  data: BlobPart | Uint8Array,
  name: string,
  type = "application/octet-stream",
) {
  const blob = new Blob([data as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function pngExport(p: Project, colored: boolean) {
  const svg = artworkSVG(p, colored);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = p.settings.width * 300;
    c.height = p.settings.height * 300;
    c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      c.toBlob((v) =>
        v ? resolve(v) : reject(Error("PNG generation failed")),
      ),
    );
    download(blob, `${p.title}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
