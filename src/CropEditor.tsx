import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  RotateCw,
  X,
} from "lucide-react";
import { loadImage } from "./samples";
import {
  artworkRatio,
  cropRect,
  legacyFrame,
  suggestCrop,
  clamp,
  rotateBox,
} from "./crop";
import type { Project } from "./types";
import type { CropFrame } from "./subject-types";
export function CropEditor({
  project,
  status,
  onApply,
  onDismiss,
  onRetry,
}: {
  project: Project;
  status: string;
  onApply: (frame: CropFrame) => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const [size, setSize] = useState({ width: 600, height: 800 }),
    [source, setSource] = useState(project.image),
    [draft, setDraft] = useState<CropFrame>(
      project.framing || { cx: 0.5, cy: 0.5, zoom: 1, allowOutside: true },
    ),
    [touched, setTouched] = useState(false);
  const svg = useRef<SVGSVGElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      frame: CropFrame;
      resize: boolean;
    } | null>(null);
  const ratio = artworkRatio(project.settings);
  useEffect(() => {
    let live = true;
    loadImage(project.image).then((image) => {
      if (!live) return;
      const quarter = project.settings.rotation % 180 !== 0,
        c = document.createElement("canvas");
      c.width = quarter ? image.height : image.width;
      c.height = quarter ? image.width : image.height;
      const ctx = c.getContext("2d")!;
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate((project.settings.rotation * Math.PI) / 180);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      setSource(c.toDataURL());
      setSize({ width: c.width, height: c.height });
      if (!project.framing)
        setDraft(legacyFrame(c.width, c.height, project.settings));
    });
    return () => {
      live = false;
    };
  }, [project.image, project.settings.rotation]);
  const suggestion = project.analysis
    ? suggestCrop(
        project.analysis,
        project.settings.rotation % 180 ? size.height : size.width,
        project.settings.rotation % 180 ? size.width : size.height,
        ratio,
        project.settings.rotation,
      )
    : undefined;
  useEffect(() => {
    if (suggestion && !touched && project.cropReview)
      setDraft(suggestion.frame);
  }, [JSON.stringify(suggestion?.frame), touched, project.cropReview]);
  useEffect(() => {
    dialog.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  const update = (frame: CropFrame) => {
    setTouched(true);
    const rect = cropRect(size.width, size.height, ratio, frame);
    setDraft({
      ...frame,
      cx: clamp(rect.x + rect.width / 2, -0.5, 1.5),
      cy: clamp(rect.y + rect.height / 2, -0.5, 1.5),
    });
  };
  const point = (e: React.PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    );
    return { x: p.x / size.width, y: p.y / size.height };
  };
  const rect = cropRect(size.width, size.height, ratio, draft),
    pad = 0.35 * Math.max(size.width, size.height);
  const box = project.analysis
    ? rotateBox(project.analysis.box, project.settings.rotation)
    : undefined;
  const nudge = (dx: number, dy: number) =>
    update({ ...draft, cx: draft.cx + dx, cy: draft.cy + dy });
  return (
    <div className="modal-backdrop">
      <div
        className="crop-dialog"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDismiss();
          if (e.key === "Tab") {
            const nodes = Array.from(
              dialog.current!.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,[tabindex="0"]',
              ),
            );
            if (e.shiftKey && document.activeElement === nodes[0]) {
              e.preventDefault();
              nodes.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
              e.preventDefault();
              nodes[0]?.focus();
            }
          }
        }}
      >
        <div className="crop-dialog-heading">
          <div>
            <div className="eyebrow">FRAME THE DETAILS THAT MATTER</div>
            <h2 id="crop-title">A better starting point.</h2>
          </div>
          <button aria-label="Close crop editor" onClick={onDismiss}>
            <X size={18} />
          </button>
        </div>
        <div className="crop-layout">
          <div>
            <div className="crop-canvas">
              <svg
                ref={svg}
                viewBox={`${-pad} ${-pad} ${size.width + 2 * pad} ${size.height + 2 * pad}`}
                tabIndex={0}
                role="application"
                aria-label="Crop area. Drag the frame or use arrow keys to move it. Shift plus arrow moves farther."
                onKeyDown={(e) => {
                  const amount = e.shiftKey ? 0.05 : 0.01;
                  const keys: Record<string, [number, number]> = {
                    ArrowLeft: [-amount, 0],
                    ArrowRight: [amount, 0],
                    ArrowUp: [0, -amount],
                    ArrowDown: [0, amount],
                  };
                  if (keys[e.key]) {
                    e.preventDefault();
                    nudge(...keys[e.key]);
                  }
                }}
                onPointerDown={(e) => {
                  if ((e.target as Element).getAttribute("data-crop-handle"))
                    return;
                  const p = point(e);
                  drag.current = { ...p, frame: { ...draft }, resize: false };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  const p = point(e),
                    d = drag.current;
                  if (d.resize) {
                    const original = cropRect(
                        size.width,
                        size.height,
                        ratio,
                        d.frame,
                      ),
                      width = Math.max(0.06, original.width + p.x - d.x),
                      base = cropRect(size.width, size.height, ratio, {
                        ...draft,
                        zoom: 1,
                      });
                    const zoom = clamp(
                        base.width / width,
                        draft.allowOutside ? 0.5 : 1,
                        8,
                      ),
                      next = cropRect(size.width, size.height, ratio, {
                        ...draft,
                        zoom,
                      });
                    update({
                      ...draft,
                      zoom,
                      cx: original.x + next.width / 2,
                      cy: original.y + next.height / 2,
                    });
                  } else
                    update({
                      ...d.frame,
                      cx: d.frame.cx + p.x - d.x,
                      cy: d.frame.cy + p.y - d.y,
                    });
                }}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
              >
                <defs>
                  <mask id="crop-dim">
                    <rect
                      x={-pad}
                      y={-pad}
                      width={size.width + 2 * pad}
                      height={size.height + 2 * pad}
                      fill="white"
                    />
                    <rect
                      x={rect.x * size.width}
                      y={rect.y * size.height}
                      width={rect.width * size.width}
                      height={rect.height * size.height}
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  x={-pad}
                  y={-pad}
                  width={size.width + 2 * pad}
                  height={size.height + 2 * pad}
                  fill="#fff"
                />
                <image href={source} width={size.width} height={size.height} />
                <rect
                  x={-pad}
                  y={-pad}
                  width={size.width + 2 * pad}
                  height={size.height + 2 * pad}
                  fill="#203a2e"
                  opacity=".48"
                  mask="url(#crop-dim)"
                />
                {box && (
                  <rect
                    className="subject-box"
                    x={box.x * size.width}
                    y={box.y * size.height}
                    width={box.width * size.width}
                    height={box.height * size.height}
                    fill="none"
                    stroke="#f7cc6e"
                    strokeDasharray="8 5"
                    strokeWidth={size.width / 250}
                  />
                )}
                <rect
                  x={rect.x * size.width}
                  y={rect.y * size.height}
                  width={rect.width * size.width}
                  height={rect.height * size.height}
                  fill="transparent"
                  stroke="white"
                  strokeWidth={size.width / 150}
                />
                {[1 / 3, 2 / 3].map((t) => (
                  <g
                    key={t}
                    stroke="white"
                    opacity=".45"
                    strokeWidth={size.width / 500}
                  >
                    <line
                      x1={(rect.x + rect.width * t) * size.width}
                      y1={rect.y * size.height}
                      x2={(rect.x + rect.width * t) * size.width}
                      y2={(rect.y + rect.height) * size.height}
                    />
                    <line
                      x1={rect.x * size.width}
                      y1={(rect.y + rect.height * t) * size.height}
                      x2={(rect.x + rect.width) * size.width}
                      y2={(rect.y + rect.height * t) * size.height}
                    />
                  </g>
                ))}
                <rect
                  data-crop-handle="resize"
                  x={(rect.x + rect.width) * size.width - size.width * 0.017}
                  y={(rect.y + rect.height) * size.height - size.width * 0.017}
                  width={size.width * 0.034}
                  height={size.width * 0.034}
                  fill="#e2bc68"
                  stroke="white"
                  strokeWidth={2}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    drag.current = {
                      ...point(e),
                      frame: { ...draft },
                      resize: true,
                    };
                    svg.current!.setPointerCapture(e.pointerId);
                  }}
                />
              </svg>
            </div>
            <p className="hint">
              Drag anywhere to move the crop. Drag the gold corner to resize.
              The gold dashed box is the detected subject, not a confirmed
              segmentation mask.
            </p>
          </div>
          <aside>
            <div className="detection-status" role="status">
              {status ||
                project.analysis?.message ||
                "Review your framing before conversion."}
            </div>
            {suggestion && (
              <>
                <p className="hint">{suggestion.reason}</p>
                <button
                  className="full"
                  onClick={() => {
                    setTouched(true);
                    setDraft(suggestion.frame);
                  }}
                >
                  Preview suggested crop
                </button>
                <p className="hint">
                  Estimated detected-area coverage:{" "}
                  {Math.round(suggestion.retention * 100)}%. This measures
                  framing, not likeness.
                </p>
              </>
            )}
            <label className="range-label">
              Crop zoom <span>{draft.zoom.toFixed(2)}×</span>
              <input
                aria-label="Crop editor zoom"
                type="range"
                min={draft.allowOutside ? 0.5 : 1}
                max="8"
                step=".05"
                value={draft.zoom}
                onChange={(e) =>
                  update({ ...draft, zoom: Number(e.target.value) })
                }
              />
            </label>
            <div className="crop-nudge">
              <button
                aria-label="Move crop left"
                onClick={() => nudge(-0.025, 0)}
              >
                <ArrowLeft size={17} />
              </button>
              <button
                aria-label="Move crop up"
                onClick={() => nudge(0, -0.025)}
              >
                <ArrowUp size={17} />
              </button>
              <button
                aria-label="Move crop down"
                onClick={() => nudge(0, 0.025)}
              >
                <ArrowDown size={17} />
              </button>
              <button
                aria-label="Move crop right"
                onClick={() => nudge(0.025, 0)}
              >
                <ArrowRight size={17} />
              </button>
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={draft.allowOutside}
                onChange={(e) =>
                  update({
                    ...draft,
                    allowOutside: e.target.checked,
                    zoom: e.target.checked
                      ? draft.zoom
                      : Math.max(1, draft.zoom),
                  })
                }
              />{" "}
              Allow white paper margins
            </label>
            <p className="hint">
              With margins on, you can move in any direction even at 1×. With
              margins off, the crop stays inside the photograph.
            </p>
            <div className="button-row">
              <button
                onClick={() =>
                  update({ cx: 0.5, cy: 0.5, zoom: 1, allowOutside: true })
                }
              >
                Center / 1×
              </button>
              <button
                onClick={() => {
                  const base = cropRect(size.width, size.height, ratio, {
                    cx: 0.5,
                    cy: 0.5,
                    zoom: 1,
                    allowOutside: true,
                  });
                  update({
                    cx: 0.5,
                    cy: 0.5,
                    zoom: Math.min(base.width, base.height),
                    allowOutside: true,
                  });
                }}
              >
                Show whole image
              </button>
            </div>
            <button
              className="text-button"
              disabled={!!status}
              onClick={onRetry}
            >
              <RotateCw size={13} /> Retry subject detection
            </button>
            <button className="primary full" onClick={() => onApply(draft)}>
              <Check size={16} />{" "}
              {project.cropReview
                ? "Accept crop & create artwork"
                : "Apply crop"}
            </button>
            <button className="full" onClick={onDismiss}>
              Keep current crop
            </button>
            <p className="hint">
              Cropping is reversible. Your original file is never overwritten.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
