import {
  PDFDocument,
  StandardFonts,
  rgb as pdfRGB,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import { dotMarks } from "./dots";
import JSZip from "jszip";
import {
  geometry,
  rgb,
  labelFits,
  topLegend,
  printWarnings,
} from "./processing";
import { editedArt, download } from "./render";
import { letter, type Project, type Notebook, type Palette } from "./types";
const ink = pdfRGB(0.19, 0.24, 0.21),
  gray = pdfRGB(0.55, 0.58, 0.54);
const color = (hex: string) => {
  const [r, g, b] = rgb(hex);
  return pdfRGB(r / 255, g / 255, b / 255);
};
const ascii = (s: string) => s.replace(/[^\x20-\x7e]/g, "-");
function text(
  page: PDFPage,
  font: PDFFont,
  s: string,
  x: number,
  y: number,
  size = 8,
  maxWidth = page.getWidth() - x - 18,
) {
  let value = ascii(s);
  if (font.widthOfTextAtSize(value, size) > maxWidth) {
    while (
      value.length &&
      font.widthOfTextAtSize(value + "...", size) > maxWidth
    )
      value = value.slice(0, -1);
    value += "...";
  }
  page.drawText(value, { x, y, size, font, color: ink });
}
async function setup() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  return { doc, font };
}
export async function artworkPDF(
  projects: Project[],
  colored = false,
  outlinesOnly = false,
  numbering = true,
) {
  const { doc, font } = await setup();
  for (const [index, p] of projects.entries()) {
    const a = editedArt(p);
    if (!a) continue;
    const s = p.settings;
    if (s.mode === "dots" && printWarnings(s, p.art!).length)
      throw Error(
        "This dot page is too dense to print safely. Reduce resolution or increase its size.",
      );
    const g = geometry(s, a.width, a.height),
      bleed = s.bleed * 72;
    if (g.pitch <= 0)
      throw Error(
        "Margins and color legend leave no printable artwork area. Increase page size or reduce margins/colors.",
      );
    const page = doc.addPage([g.width + bleed * 2, g.height + bleed * 2]);
    page.setTrimBox(bleed, bleed, g.width, g.height);
    page.setBleedBox(0, 0, g.width + bleed * 2, g.height + bleed * 2);
    const y = (v: number) => g.height + bleed - v;
    const x = (v: number) => v + bleed;
    text(
      page,
      font,
      p.title.slice(0, 60) + (numbering ? ` | ${index + 1}` : ""),
      x(s.margin * 72),
      y(s.binding * 72 + 14),
      8,
    );
    if (s.mode === "dots" || s.lineLabels)
      topLegend(a.palette, g.width, s.margin * 72).forEach((group) => {
        const rowY = (s.margin + s.binding) * 72 + 15 + group.yOffset;
        text(page, font, group.label, x(group.x), y(rowY), 4);
        group.entries.forEach(({ index: i, x: xx }) => {
          const m = a.palette[i];
          page.drawCircle({
            x: x(xx + 3),
            y: y(rowY - 2),
            size: 2.5,
            color: colored ? color(m.hex) : pdfRGB(1, 1, 1),
            borderColor: gray,
            borderWidth: 0.4,
          });
          text(page, font, letter(i), x(xx + 8), y(rowY), 5);
        });
      });
    if (a.mode === "dots") {
      dotMarks(p.art!, s, g).forEach(
        ({ id, cell, color: measured, x: xx, y: yy, diameter, font: size }) => {
          const n =
            p.edits[id] ?? p.edits[cell] ?? measured ?? a.assignments[cell];
          if (n < 0) return;
          if (colored || s.guide === "circles")
            page.drawCircle({
              x: x(xx),
              y: y(yy),
              size: diameter / 2,
              color: colored ? color(a.palette[n].hex) : pdfRGB(1, 1, 1),
              borderColor: gray,
              borderWidth: colored ? 0 : 0.35,
            });
          if (!colored && s.labels) {
            const label = letter(n);
            page.drawText(label, {
              x: x(xx) - font.widthOfTextAtSize(label, size) / 2,
              y: y(yy) - size * 0.34,
              font,
              size,
              color: gray,
            });
          }
        },
      );
    } else
      for (const r of a.regions) {
        if (s.background === "remove" && r.color < 0) continue;
        page.drawSvgPath(r.paths.join(" "), {
          x: x(g.left),
          y: y(g.top),
          scale: g.pitch,
          color:
            colored && r.color >= 0
              ? color(a.palette[r.color].hex)
              : pdfRGB(1, 1, 1),
          borderColor: ink,
          borderWidth: s.thickness / g.pitch,
        });
        if (
          !colored &&
          !outlinesOnly &&
          s.lineLabels &&
          r.color >= 0 &&
          labelFits(r, s, g.pitch)
        )
          text(
            page,
            font,
            letter(r.color),
            x(g.left + r.label[0] * g.pitch) - 1.6,
            y(g.top + r.label[1] * g.pitch) - 1.5,
            5,
          );
      }
    text(
      page,
      font,
      `${s.width} x ${s.height} in | Print at 100% | Paper & Pigment`,
      x(s.margin * 72),
      y(g.height - 12),
      5,
    );
    if (bleed) {
      for (const [xx, yy] of [
        [bleed, bleed],
        [bleed + g.width, bleed],
        [bleed, bleed + g.height],
        [bleed + g.width, bleed + g.height],
      ]) {
        page.drawLine({
          start: { x: xx - bleed * 0.8, y: yy },
          end: { x: xx - bleed * 0.2, y: yy },
          thickness: 0.3,
        });
        page.drawLine({
          start: { x: xx, y: yy - bleed * 0.8 },
          end: { x: xx, y: yy - bleed * 0.2 },
          thickness: 0.3,
        });
      }
    }
  }
  if (!doc.getPageCount()) throw Error("Generate artwork before exporting.");
  return doc.save();
}
export async function keyPDF(projects: Project[]) {
  const { doc, font } = await setup();
  if (projects.length > 1) {
    let page: PDFPage | undefined,
      yy = 0;
    for (const [i, p] of projects.entries()) {
      const a = editedArt(p);
      if (!a) continue;
      const height = Math.ceil(a.palette.length / 12) * 14 + 18;
      if (!page || yy - height < 45) {
        page = doc.addPage([360, 504]);
        text(page, font, "YOUR NOTEBOOK COLOR STORY", 22, 450, 12);
        text(
          page,
          font,
          "Full marker names and test spaces follow.",
          22,
          432,
          7,
        );
        yy = 410;
      }
      text(page, font, `pg. ${i + 1}`, 22, yy, 7);
      a.palette.forEach((m, j) => {
        const x = 78 + (j % 12) * 22,
          y = yy - Math.floor(j / 12) * 14;
        page!.drawCircle({ x, y: y + 2, size: 2.6, color: color(m.hex) });
        text(page!, font, letter(j), x + 5, y, 5);
      });
      yy -= height;
    }
  }
  for (const [i, p] of projects.entries()) {
    const a = editedArt(p);
    if (!a) continue;
    const height = p.settings.height * 72,
      width = p.settings.width * 72;
    const rows = Math.max(1, Math.floor((height - 145) / 20));
    for (let offset = 0; offset < a.palette.length; offset += rows) {
      const page = doc.addPage([width, height]);
      text(
        page,
        font,
        `COLOR KEY | PAGE ${i + 1}${offset ? " (continued)" : ""}`,
        22,
        height - 60,
        11,
      );
      text(page, font, p.title.slice(0, 55), 22, height - 78, 9);
      a.palette.slice(offset, offset + rows).forEach((m, j) => {
        const yy = height - 104 - j * 20;
        page.drawCircle({ x: 29, y: yy, size: 4, color: color(m.hex) });
        text(
          page,
          font,
          `${letter(offset + j)}  ${m.code || "Unverified code"} - ${m.name}`,
          42,
          yy - 3,
          7,
          width - 93,
        );
        page.drawRectangle({
          x: width - 43,
          y: yy - 5,
          width: 20,
          height: 10,
          borderColor: gray,
          borderWidth: 0.4,
        });
      });
      text(
        page,
        font,
        "Digital swatches are approximate. Test your ink on this paper.",
        22,
        28,
        6,
      );
    }
  }
  return doc.save();
}
export async function calibrationPDF(palette: Palette) {
  const { doc, font } = await setup();
  const columns = 5;
  for (let offset = 0; offset < palette.markers.length; offset += 40) {
    const page = doc.addPage([612, 792]);
    text(page, font, "MARKER CALIBRATION", 36, 752, 18);
    text(
      page,
      font,
      "Fill the boxes. Scan flat; crop exactly to the outer frame before uploading.",
      36,
      732,
      9,
    );
    text(page, font, `Paper: ${palette.paper}`.slice(0, 90), 36, 714, 9);
    page.drawRectangle({
      x: 36,
      y: 72,
      width: 540,
      height: 624,
      borderColor: ink,
      borderWidth: 1,
    });
    for (let j = 0; j < 40; j++) {
      const m = palette.markers[offset + j];
      const x = 36 + (j % columns) * 108,
        y = 696 - Math.floor(j / columns) * 78;
      page.drawRectangle({
        x: x + 23,
        y: y - 49,
        width: 62,
        height: 30,
        borderColor: gray,
        borderWidth: 0.5,
      });
      if (m)
        text(
          page,
          font,
          `${offset + j + 1}: ${m.code || m.name}`.slice(0, 21),
          x + 8,
          y - 64,
          7,
        );
    }
    text(
      page,
      font,
      `Sheet ${offset / 40 + 1}. Leave unused boxes white. White reference: outer-frame margin.`,
      36,
      40,
      8,
    );
  }
  return doc.save();
}
export const guideSteps = [
  "Choose the finished size and confirm the printer specifications.",
  "Export files and print one proof at 100% scale; disable fit-to-page.",
  "Check dot diameter, letter legibility, region size and color-key mapping.",
  "Test both marker tips on the chosen 120-160 gsm uncoated stock. Check bleed and feathering.",
  "Print artwork single-sided; proof every page before the full run.",
  "Trim interiors and cover to finished size using the trim box.",
  "Cut 1.5-2 mm chipboard backing to finished dimensions; confirm punch capacity.",
  "Cut a smooth PP or PET protective insert. Round sharp corners.",
  "Prepare the cover and separate printed instruction card. Do not use ordinary printer stock settings on plastic.",
  "Confirm the top binding clearance and hole pattern with your binding supplier.",
  "Stack cover, instruction card, artwork pages, color keys and rigid backing.",
  "Punch the approved hole pattern, then install the selected spiral or Wire-O.",
  "Place the protective sheet directly under the artwork being colored. Move it as you progress.",
  "Inspect page turning, sharp edges, binding closure, trim and print quality.",
];
export async function documentPDF(
  title: string,
  lines: string[],
  w = 360,
  h = 504,
) {
  const { doc, font } = await setup();
  let page = doc.addPage([w, h]),
    y = h - 48;
  const heading = () => {
    text(page, font, title, 24, y, 15);
    y -= 28;
  };
  heading();
  for (const line of lines) {
    const words = ascii(line).split(" ");
    let row = "";
    for (const word of words) {
      if (font.widthOfTextAtSize(row + " " + word, 9) > w - 48) {
        if (y < 35) {
          page = doc.addPage([w, h]);
          y = h - 40;
        }
        text(page, font, row, 24, y, 9);
        y -= 14;
        row = word;
      } else row += (row ? " " : "") + word;
    }
    if (y < 35) {
      page = doc.addPage([w, h]);
      y = h - 40;
    }
    text(page, font, row, 24, y, 9);
    y -= 23;
  }
  return doc.save();
}
export async function protectivePDF(p: Project, bound = false) {
  const { doc, font } = await setup();
  const w = p.settings.width * 72,
    h = p.settings.height * 72,
    page = doc.addPage([w, h]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: w,
    height: h,
    borderColor: gray,
    borderWidth: 0.5,
    borderDashArray: [3, 3],
  });
  if (bound)
    page.drawRectangle({
      x: 3,
      y: h - p.settings.binding * 72,
      width: w - 6,
      height: p.settings.binding * 72 - 3,
      borderColor: gray,
      borderWidth: 0.5,
    });
  text(page, font, "REUSABLE PROTECTIVE SHEET", 20, h - 85, 13);
  const lines = [
    "Place this sheet directly underneath the artwork",
    "you are coloring. Move it to the next page as you progress.",
    "",
    "Cut smooth polypropylene (PP) or PET to the trim outline.",
    `${p.settings.width} x ${p.settings.height} inches. Round sharp corners.`,
    bound
      ? "Bound-in: confirm slot and binding mechanics with your printer."
      : "Removable insert: no binding holes required.",
    "Print these instructions on a separate paper card.",
    "Do not assume a home printer can print directly on plastic.",
    "Test your ink, stock and protective material before assembly.",
  ];
  lines.forEach((line, i) => text(page, font, line, 20, h - 115 - i * 19, 7));
  return doc.save();
}
export function estimatedCost(n: Notebook) {
  return (
    n.pages.length * n.paperCost +
    n.coverCost +
    n.boardCost +
    n.plasticCost +
    n.bindingCost +
    n.laborCost
  );
}
export async function notebookZIP(n: Notebook) {
  if (!n.pages.length) throw Error("Add at least one generated page.");
  const zip = new JSZip(),
    p = n.pages[0],
    s = p.settings;
  zip.file(
    "interior_print_ready.pdf",
    await artworkPDF(n.pages, false, false, n.numbering),
  );
  zip.file(
    "colored_preview.pdf",
    await artworkPDF(n.pages, true, false, n.numbering),
  );
  zip.file("color_key.pdf", await keyPDF(n.pages));
  zip.file("marker_swatch_calibration.pdf", await calibrationPDF(p.palette));
  zip.file(
    "front_cover.pdf",
    await documentPDF(
      n.title,
      [
        "A little time. A little color.",
        `${n.pages.length} original coloring pages`,
        "Made with Paper & Pigment",
      ],
      s.width * 72,
      s.height * 72,
    ),
  );
  zip.file(
    "back_cover_spec.pdf",
    await documentPDF(
      "BACKING SPECIFICATION",
      [
        `${s.width} x ${s.height} inches finished. ${n.boardMm} mm rigid chipboard.`,
        `Top binding clearance: ${s.binding} inches. Confirm hole pattern, board punch capacity and binding diameter with the printer.`,
        "Prototype specification: confirm stock, thickness and all dimensions with your supplier.",
      ],
      s.width * 72,
      s.height * 72,
    ),
  );
  zip.file(
    "protective_sheet_template.pdf",
    await protectivePDF(p, n.protective === "bound"),
  );
  zip.file(
    "manufacturing_guide.pdf",
    await documentPDF("MANUFACTURING GUIDE", [
      ...guideSteps.map((x, i) => `${i + 1}. ${x}`),
      `Quote quantities: 1, 5, 10, 25, 50, 100. Current quantity: ${n.quantity}.`,
      `Specifications: ${s.width} x ${s.height} in; ${n.pages.length} single-sided pages; ${n.paperGsm} gsm uncoated paper; ${n.boardMm} mm backing; ${s.binding} in binding clearance; ${s.margin} in safe margin; ${s.bleed} in bleed.`,
      `Estimated unit cost: $${estimatedCost(n).toFixed(2)}; total $${(estimatedCost(n) * n.quantity).toFixed(2)}. User assumptions only, not a supplier quotation.`,
      "RGB artwork; no certified CMYK profile or color compliance. Confirm proof, finishing, lead time, tax and shipping in the supplier quote.",
    ]),
  );
  zip.file(
    "bill_of_materials.csv",
    `Item,Quantity per notebook,Unit assumption USD,Notes\nInterior paper,${n.pages.length},${n.paperCost},${n.paperGsm} gsm uncoated single sided\nCover,1,${n.coverCost},Confirm stock\nChipboard,1,${n.boardCost},${n.boardMm} mm\nPP or PET insert,1,${n.plasticCost},${n.protective}\nTop binding,1,${n.bindingCost},Confirm pitch and diameter\nCutting and assembly,1,${n.laborCost},User estimate\n`,
  );
  zip.file(
    "project.json",
    JSON.stringify({ version: 1, notebook: n }, null, 2),
  );
  download(await zip.generateAsync({ type: "blob" }), `${n.title}.zip`);
}
