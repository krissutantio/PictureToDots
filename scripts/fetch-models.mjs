// Build/setup-time downloads only. Runtime inference never contacts these hosts.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const models = {
  "face_landmarker.task":
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  "efficientdet_lite0.tflite":
    "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
  "efficientnet_lite0.tflite":
    "https://storage.googleapis.com/mediapipe-models/image_classifier/efficientnet_lite0/float32/1/efficientnet_lite0.tflite",
};
await mkdir("public/vision", { recursive: true });
const manifest = {};
for (const [name, url] of Object.entries(models)) {
  let data;
  try {
    data = await readFile("public/vision/" + name);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw Error(`${name}: HTTP ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
    await writeFile("public/vision/" + name, data);
  }
  manifest[name] = {
    url,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  };
  console.log(`${name}: ${data.length} bytes`);
}
await writeFile(
  "public/vision/models.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
