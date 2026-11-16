/* Runs inside a CSP-inheriting blob classic worker. All inference stays local. */
const actualFetch = self.fetch.bind(self);
self.fetch = (resource, options) => {
  const url = new URL(
    resource instanceof Request ? resource.url : String(resource),
    self.ASSET_BASE,
  );
  if (url.origin !== new URL(self.ASSET_BASE).origin)
    return Promise.resolve(new Response(null, { status: 204 }));
  return actualFetch(resource, options);
};
self.onmessage = async ({ data }) => {
  let bitmap = data.bitmap;
  const tasks = [];
  try {
    importScripts(new URL("vision_bundle.js", self.ASSET_BASE).href);
    self.postMessage({ progress: "Loading local face landmarks…" });
    const files = await Vision.FilesetResolver.forVisionTasks(
      new URL("wasm", self.ASSET_BASE).href,
    );
    const face = await Vision.FaceLandmarker.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: new URL("face_landmarker.task", self.ASSET_BASE).href,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      numFaces: 5,
      minFaceDetectionConfidence: 0.6,
      minFacePresenceConfidence: 0.6,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    tasks.push(face);
    const result = face.detect(bitmap);
    const faces = result.faceLandmarks.map((points) => {
      const pick = (indices) =>
        indices.map((i) => ({ x: points[i].x, y: points[i].y }));
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      const x = Math.min(...xs),
        y = Math.min(...ys);
      return {
        box: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
        points: points.map((p) => ({ x: p.x, y: p.y })),
        groups: {
          eyes: [
            pick([33, 160, 158, 133, 153, 144, 33]),
            pick([362, 385, 387, 263, 373, 380, 362]),
          ],
          brows: [
            pick([70, 63, 105, 66, 107]),
            pick([336, 296, 334, 293, 300]),
          ],
          nose: pick([168, 6, 197, 195, 5, 4, 1, 2]),
          mouth: pick([61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91, 61]),
          oval: pick([
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365,
            379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93,
            234, 127, 162, 21, 54, 103, 67, 109, 10,
          ]),
        },
      };
    });
    if (faces.length) {
      self.postMessage({
        faces,
        kind: "Portrait",
        method: "face landmarks",
        // The SDK exposes no per-face score; report its configured minimum, not a fabricated score.
        confidence: 0.6,
      });
      return;
    }
    self.postMessage({ progress: "Looking for animals, plants and objects…" });
    const detector = await Vision.ObjectDetector.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: new URL("efficientdet_lite0.tflite", self.ASSET_BASE)
          .href,
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      scoreThreshold: 0.4,
      maxResults: 8,
    });
    tasks.push(detector);
    const detections = detector.detect(bitmap).detections;
    if (detections.length) {
      const sorted = detections
        .map((d) => ({
          d,
          score:
            d.categories[0].score *
            Math.sqrt(
              (d.boundingBox.width * d.boundingBox.height) /
                (bitmap.width * bitmap.height),
            ),
        }))
        .sort((a, b) => b.score - a.score);
      const d = sorted[0].d,
        name = d.categories[0].categoryName,
        b = d.boundingBox;
      const kind =
        /cat|dog|bird|horse|sheep|cow|elephant|bear|zebra|giraffe/.test(name)
          ? "Animal"
          : /plant/.test(name)
            ? "Flower / plant"
            : name === "person"
              ? "Portrait"
              : "General object";
      self.postMessage({
        faces: [],
        kind,
        method: "object detector",
        confidence: d.categories[0].score,
        label: name,
        box: {
          x: b.originX / bitmap.width,
          y: b.originY / bitmap.height,
          width: b.width / bitmap.width,
          height: b.height / bitmap.height,
        },
      });
      return;
    }
    self.postMessage({ progress: "Checking scene category…" });
    const classifier = await Vision.ImageClassifier.createFromOptions(files, {
      baseOptions: {
        modelAssetPath: new URL("efficientnet_lite0.tflite", self.ASSET_BASE)
          .href,
        delegate: "CPU",
      },
      maxResults: 5,
    });
    tasks.push(classifier);
    const categories =
      classifier.classify(bitmap).classifications[0]?.categories || [];
    const top = categories[0];
    if (top && top.score > 0.3) {
      const name = top.categoryName.toLowerCase();
      const kind = /daisy|flower|rose|poppy|orchid|plant|sunflower/.test(name)
        ? "Flower / plant"
        : /mountain|valley|lakeside|seashore|volcano|cliff|alp|sandbar|promontory/.test(
              name,
            )
          ? "Landscape"
          : /church|castle|monastery|palace|building|mosque|tower|barn|dome|lighthouse/.test(
                name,
              )
            ? "Building"
            : /dog|cat|terrier|retriever|bird|hound|spaniel|poodle|horse|bear|fox|lion|tiger|wolf/.test(
                  name,
                )
              ? "Animal"
              : "General object";
      self.postMessage({
        faces: [],
        kind,
        method: "image classifier + saliency",
        confidence: top.score,
        label: top.categoryName,
      });
      return;
    }
    self.postMessage({
      fallback:
        "No subject category met the confidence threshold. Using generic structure-aware processing.",
    });
  } catch (error) {
    self.postMessage({
      fallback:
        "Advanced detection was unavailable. Generic saliency is active.",
      detail: String(error),
    });
  } finally {
    bitmap?.close();
    tasks.forEach((t) => t.close());
  }
};
