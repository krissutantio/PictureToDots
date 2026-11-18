import { processPixels } from "./processing";
import {
  featurePrepare,
  featureMetrics,
  comparisonPriorities,
} from "./features";
import type { Settings, Artwork } from "./types";
self.onmessage = ({ data: job }) => {
  try {
    const detailField = (
      art: Artwork,
      settings: Settings,
      data: Uint8ClampedArray,
      importance?: Float32Array,
      portraitEvidence?: Float32Array,
      portraitToneArea?: Uint8Array,
    ) => {
      if (art.mode !== "dots" || !job.inputWidth) return art;
      const detail = processPixels(
        data,
        job.inputWidth,
        job.inputHeight,
        {
          ...settings,
          mode: "dots",
          smoothing: 0,
          dither: false,
          background: "keep",
          colors: art.palette.length,
        },
        art.palette,
      );
      art.dotField = {
        width: job.inputWidth,
        height: job.inputHeight,
        assignments: detail.assignments,
        importance: importance ? Array.from(importance) : undefined,
        portraitV3:
          portraitEvidence && portraitToneArea
            ? {
                evidence: Array.from(portraitEvidence),
                toneArea: Array.from(portraitToneArea),
              }
            : undefined,
      };
      if (settings.background !== "keep")
        art.dotField.assignments = detail.assignments.map(
          (v: number, i: number) => {
            const x = i % job.inputWidth,
              y = Math.floor(i / job.inputWidth),
              cell =
                Math.min(
                  art.height - 1,
                  Math.floor((y / job.inputHeight) * art.height),
                ) *
                  art.width +
                Math.min(
                  art.width - 1,
                  Math.floor((x / job.inputWidth) * art.width),
                );
            return art.assignments[cell] < 0 ? -1 : v;
          },
        );
      return art;
    };
    const run = (settings: Settings): Artwork => {
      if (settings.priority === "Color Accuracy" || !job.inputWidth)
        return detailField(
          processPixels(
            job.baselineData || job.data,
            job.width,
            job.height,
            settings,
            job.markers,
          ),
          settings,
          job.data,
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
      return detailField(
        art,
        settings,
        prepared.detailData,
        prepared.detailImportance,
        prepared.portraitEvidence,
        prepared.portraitToneArea,
      );
    };
    const art = run(job.settings);
    let comparisons: Record<string, Artwork> | undefined;
    if (job.compare) {
      comparisons = {};
      for (const priority of comparisonPriorities(job.settings))
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
