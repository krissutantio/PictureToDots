import { useState } from "react";
import type { Project, Artwork } from "./types";
import { artworkSVG } from "./render";
import { priorities } from "./features";
export function StrategyComparison({
  project,
  comparisons,
  busy,
  onProof,
}: {
  project: Project;
  comparisons: Record<string, Artwork>;
  busy: boolean;
  onProof: () => void;
}) {
  const [printSize, setPrintSize] = useState(false);
  return (
    <section className="strategy-comparison">
      <div className="strategy-heading">
        <div>
          <h2>Compare what survives at a glance.</h2>
          <p className="hint">
            Same crop, grid, color limit and allowed markers. A numerical
            diagnostic cannot guarantee likeness.
          </p>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={printSize}
            onChange={(e) => setPrintSize(e.target.checked)}
          />{" "}
          Show print-layout size
        </label>
        <button
          disabled={busy || Object.keys(comparisons).length < 3}
          onClick={onProof}
        >
          Download comparison proof PDF
        </button>
      </div>
      <p className="hint">
        {printSize
          ? "CSS inches are approximate on screen. Print the proof at 100% for true physical size."
          : "Thumbnail view helps reveal whether the subject reads at a small scale."}
      </p>
      <div className="strategy-cards">
        <article
          style={{ width: printSize ? `${project.settings.width}in` : 150 }}
        >
          <h3>Original photograph</h3>
          <img
            src={project.image}
            alt="Uncropped original for strategy comparison"
          />
          <p>Original source; the artwork uses your accepted crop.</p>
        </article>
        {priorities.slice(0, 3).map((priority) => {
          const art = comparisons[priority];
          return (
            <article
              key={priority}
              style={{ width: printSize ? `${project.settings.width}in` : 150 }}
            >
              <h3>{priority}</h3>
              {art ? (
                <div
                  className="comparison-art"
                  dangerouslySetInnerHTML={{
                    __html: artworkSVG(
                      {
                        ...project,
                        settings: { ...project.settings, priority },
                        art,
                        edits: {},
                      },
                      true,
                    ),
                  }}
                />
              ) : (
                <p>{busy ? "Processing…" : "Waiting for comparison"}</p>
              )}
              {art?.diagnostics && (
                <p>
                  Protected cells: {art.diagnostics.metrics.protectedCells}
                  <br />
                  Observed edge agreement:{" "}
                  {Math.round(art.diagnostics.metrics.edgeAlignment * 100)}%
                  <br />
                  Local contrast:{" "}
                  {art.diagnostics.metrics.outputEdgeContrast.toFixed(1)} / 255
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
