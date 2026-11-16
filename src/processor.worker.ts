import { processPixels } from "./processing";
import { featurePrepare, featureMetrics, priorities } from "./features";
import type { Settings, Artwork } from "./types";
self.onmessage = ({ data: job }) => {
  try {
    const run = (settings: Settings): Artwork => {
      if (settings.priority === "Color Accuracy" || !job.inputWidth)
        return processPixels(
          job.baselineData || job.data,
          job.width,
          job.height,
          settings,
          job.markers,
        );
      const prepared = featurePrepare(
        job.data,
        job.inputWidth,
        job.inputHeight,
        job.width,
        job.height,
        settings,
        job.analysis,
        job.strokes || [],
        job.rect,
      );
      const art = processPixels(
        prepared.data,
        job.width,
        job.height,
        settings,
        job.markers,
        prepared.features,
      );
      art.diagnostics = {
        importance: Array.from(prepared.features.importance),
        edges: Array.from(prepared.features.edges),
        metrics: featureMetrics(
          art,
          prepared.data,
          prepared.features,
          job.analysis,
          job.rect,
          settings,
        ),
      };
      return art;
    };
    const art = run(job.settings);
    let comparisons: Record<string, Artwork> | undefined;
    if (job.compare) {
      comparisons = {};
      for (const priority of priorities.slice(0, 3))
        comparisons[priority] =
          priority === job.settings.priority
            ? art
            : run({ ...job.settings, priority });
    }
    self.postMessage({ art, comparisons });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
