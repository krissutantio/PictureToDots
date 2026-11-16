import { analyzeSaliency } from "./saliency";
self.onmessage = (e) => {
  try {
    self.postMessage(analyzeSaliency(e.data.data, e.data.width, e.data.height));
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
