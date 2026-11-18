import { useEffect, useState } from "react";
import { prepareInput } from "./input";
import { portraitPriority } from "./portrait";
import type { Project, Artwork } from "./types";
import { artworkSVG } from "./render";
import { comparisonPriorities } from "./features";
export function StrategyComparison({
  project,
  comparisons,
  busy,
  onProof,
  onUpgradePortrait,
}: {
  project: Project;
  comparisons: Record<string, Artwork>;
  busy: boolean;
  onProof: () => void;
  onUpgradePortrait: () => void;
}) {
  const [printSize, setPrintSize] = useState(false);
  const [cropPreview, setCropPreview] = useState("");
  useEffect(() => {
    let disposed = false;
    setCropPreview("");
    prepareInput(project)
      .then((input) => {
        if (disposed) return;
        const canvas = document.createElement("canvas");
        canvas.width = input.inputWidth;
        canvas.height = input.inputHeight;
        canvas
          .getContext("2d")!
          .putImageData(
            new ImageData(
              new Uint8ClampedArray(input.data),
              canvas.width,
              canvas.height,
            ),
            0,
            0,
          );
        setCropPreview(canvas.toDataURL());
      })
      .catch(() => {
        /* Processing reports image errors in the studio. */
      });
    return () => {
      disposed = true;
    };
  }, [project.image, project.framing, project.settings]);
  const strategies = comparisonPriorities(project.settings);
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
          disabled={
            busy || strategies.some((priority) => !comparisons[priority])
          }
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
          <h3>Accepted source crop</h3>
          {cropPreview && (
            <img
              src={cropPreview}
              alt="Source photograph with the accepted crop and rotation"
            />
          )}
          <p>Same framing as the artwork, before color conversion.</p>
        </article>
        {strategies.map((priority) => {
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
              {priority === portraitPriority &&
                (project.art?.dotField?.portraitV1 ||
                  (project.art?.dotField?.portraitV2 && project.settings.dotLayout === "adaptive" && project.settings.dotLayoutVersion === 3)) &&
                !project.art.dotField.portraitV3 && (
                  <>
                    <p>
                      Review the updated portrait. Applying it resets manual dot
                      colors because dot positions can change. Undo restores
                      your previous artwork.
                    </p>
                    <button
                      disabled={busy || !art?.dotField?.portraitV3}
                      onClick={onUpgradePortrait}
                    >
                      Use updated portrait
                    </button>
                  </>
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
