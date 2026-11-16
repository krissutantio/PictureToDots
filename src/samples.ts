// Original procedural illustrations; no remote images or licenses required.
export function sampleImage(kind = "Flowers"): string {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#e9eee5";
  c.fillRect(0, 0, 600, 800);
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
    r = 0,
  ) => {
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, r, 0, Math.PI * 2);
    c.fill();
  };
  if (kind === "Flowers") {
    c.fillStyle = "#a4cdd1";
    c.fillRect(0, 0, 600, 800);
    for (const [x, y, size] of [
      [195, 240, 105],
      [410, 410, 110],
      [210, 590, 70],
    ]) {
      c.strokeStyle = "#345d48";
      c.lineWidth = 18;
      c.beginPath();
      c.moveTo(x, 800);
      c.quadraticCurveTo(x - 30, y + 180, x, y);
      c.stroke();
      ellipse(x - 52, y + 220, 68, 25, "#476f4e", -0.55);
      ellipse(x + 48, y + 160, 65, 24, "#66834d", 0.6);
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        ellipse(
          x + Math.cos(angle) * size * 0.65,
          y + Math.sin(angle) * size * 0.65,
          size * 0.54,
          size * 0.25,
          i % 2 ? "#edc4c4" : "#db9bac",
          angle,
        );
      }
      ellipse(x, y, size * 0.36, size * 0.36, "#dfa130");
      ellipse(x - 8, y - 8, size * 0.24, size * 0.24, "#efd16b");
    }
  } else if (kind === "Landscape") {
    c.fillStyle = "#a4cdd1";
    c.fillRect(0, 0, 600, 800);
    ellipse(435, 180, 66, 66, "#efd16b");
    for (const [y, color] of [
      [400, "#aaa0c3"],
      [510, "#66834d"],
      [650, "#285447"],
    ] as [number, string][]) {
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, y + 100);
      c.lineTo(155, y - 110);
      c.lineTo(320, y + 40);
      c.lineTo(470, y - 70);
      c.lineTo(600, y + 80);
      c.lineTo(600, 800);
      c.lineTo(0, 800);
      c.fill();
    }
    c.fillStyle = "#8bc1cd";
    c.beginPath();
    c.moveTo(300, 510);
    c.bezierCurveTo(600, 600, 50, 690, 350, 800);
    c.lineTo(520, 800);
    c.bezierCurveTo(120, 690, 650, 590, 300, 510);
    c.fill();
  } else if (kind === "Animal") {
    ellipse(300, 600, 180, 220, "#d3b18a");
    c.fillStyle = "#705547";
    c.beginPath();
    c.moveTo(125, 300);
    c.lineTo(130, 120);
    c.lineTo(260, 260);
    c.lineTo(390, 260);
    c.lineTo(490, 120);
    c.lineTo(480, 350);
    c.fill();
    ellipse(300, 350, 185, 160, "#d3b18a");
    ellipse(235, 345, 30, 38, "#285447");
    ellipse(370, 345, 30, 38, "#285447");
    ellipse(235, 350, 10, 28, "#343e3b");
    ellipse(370, 350, 10, 28, "#343e3b");
    ellipse(300, 405, 24, 17, "#db9bac");
    c.strokeStyle = "#705547";
    c.lineWidth = 5;
    for (const y of [410, 440]) {
      c.beginPath();
      c.moveTo(260, y);
      c.lineTo(110, y - 15);
      c.moveTo(340, y);
      c.lineTo(500, y - 15);
      c.stroke();
    }
  } else {
    ellipse(300, 770, 235, 230, "#447e9c");
    ellipse(300, 390, 175, 235, "#705547");
    ellipse(300, 420, 130, 175, "#d3b18a");
    ellipse(260, 420, 13, 10, "#343e3b");
    ellipse(350, 420, 13, 10, "#343e3b");
    ellipse(305, 505, 38, 12, "#9e4e66");
    ellipse(230, 275, 85, 100, "#705547", 0.7);
    ellipse(365, 275, 85, 100, "#705547", -0.7);
  }
  return canvas.toDataURL("image/png");
}
export async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
export async function normalizeFile(file: File): Promise<string> {
  if (file.size > 30 * 1024 * 1024)
    throw Error("Please choose an image smaller than 30 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const c = document.createElement("canvas");
    const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } catch {
    throw Error(
      "This image could not be decoded. Please use JPEG, PNG, or WebP.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
