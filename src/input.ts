import { loadImage } from "./samples";
import { artworkRatio, cropRect, legacyFrame } from "./crop";
import type { Project } from "./types";
export async function prepareInput(project: Project) {
  const s = project.settings,
    image = await loadImage(project.image),
    rotated = document.createElement("canvas"),
    quarter = s.rotation % 180 !== 0;
  rotated.width = quarter ? image.height : image.width;
  rotated.height = quarter ? image.width : image.height;
  const rc = rotated.getContext("2d")!;
  rc.translate(rotated.width / 2, rotated.height / 2);
  rc.rotate((s.rotation * Math.PI) / 180);
  rc.drawImage(image, -image.width / 2, -image.height / 2);
  const ratio = artworkRatio(s),
    width = s.mode === "dots" ? s.columns : s.lineDetail,
    height = Math.max(8, Math.round(width / ratio)),
    rect = cropRect(
      rotated.width,
      rotated.height,
      ratio,
      project.framing || legacyFrame(rotated.width, rotated.height, s),
    );
  const sample = (w: number, h: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "white";
    c.fillRect(0, 0, w, h);
    c.drawImage(
      rotated,
      rect.x * rotated.width,
      rect.y * rotated.height,
      rect.width * rotated.width,
      rect.height * rotated.height,
      0,
      0,
      w,
      h,
    );
    return c.getImageData(0, 0, w, h).data;
  };
  const factor = Math.min(4, 600 / width, 850 / height),
    inputWidth = Math.max(width, Math.round(width * factor)),
    inputHeight = Math.max(height, Math.round(height * factor));
  return {
    data: sample(inputWidth, inputHeight),
    baselineData: sample(width, height),
    width,
    height,
    inputWidth,
    inputHeight,
    rect,
  };
}
export function originalData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(Error("Could not retain original image file."));
    reader.readAsDataURL(file);
  });
}
