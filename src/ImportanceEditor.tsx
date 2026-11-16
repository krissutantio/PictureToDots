import { useEffect, useRef, useState } from "react";
import type { Project } from "./types";
import type { ImportanceStroke, Point } from "./subject-types";
import { importanceMap } from "./features";
export function ImportanceEditor({
  project,
  onChange,
}: {
  project: Project;
  onChange: (strokes: ImportanceStroke[]) => void;
}) {
  const [brush, setBrush] = useState<1 | -1>(1),
    [radius, setRadius] = useState(0.035),
    [draft, setDraft] = useState<Point[]>([]),
    [heat, setHeat] = useState(""),
    [showFaces, setShowFaces] = useState(true);
  const svg = useRef<SVGSVGElement>(null),
    active = useRef(false);
  const a = project.analysis,
    w = a?.width || 150,
    h = a?.height || 200;
  useEffect(() => {
    if (!a) return;
    const map = importanceMap(
      w,
      h,
      project.settings.columns,
      project.settings,
      a,
      project.importanceStrokes || [],
      { x: 0, y: 0, width: 1, height: 1 },
      0,
    );
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!,
      pixels = ctx.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const v = map.importance[i];
      pixels.data[i * 4] = Math.round(250 * v);
      pixels.data[i * 4 + 1] = Math.round(180 * (1 - v));
      pixels.data[i * 4 + 2] = Math.round(210 * (1 - v));
      pixels.data[i * 4 + 3] = Math.round(90 + v * 75);
    }
    ctx.putImageData(pixels, 0, 0);
    setHeat(canvas.toDataURL());
  }, [a, project.settings, project.importanceStrokes]);
  const point = (e: React.PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.current!.getScreenCTM()!.inverse(),
    );
    return {
      x: Math.max(0, Math.min(1, p.x / w)),
      y: Math.max(0, Math.min(1, p.y / h)),
    };
  };
  const finish = () => {
    if (active.current && draft.length)
      onChange([
        ...(project.importanceStrokes || []),
        { points: draft, radius, value: brush },
      ]);
    active.current = false;
    setDraft([]);
  };
  return (
    <section className="importance-editor">
      <div className="importance-tools">
        <div>
          <h2>Tell the algorithm what matters.</h2>
          <p className="hint">
            Warm colors: higher importance. Cool colors: lower priority. Gold
            lines: detected facial landmarks. White lines: observed
            protected-edge candidates. Predictions are not guaranteed anatomy.
          </p>
        </div>
        <div className="button-row">
          <button
            className={brush === 1 ? "selected" : ""}
            onClick={() => setBrush(1)}
          >
            Preserve / emphasize
          </button>
          <button
            className={brush === -1 ? "selected" : ""}
            onClick={() => setBrush(-1)}
          >
            Simplify / de-emphasize
          </button>
        </div>
        <label className="range-label">
          Brush size<span>{Math.round(radius * 100)}%</span>
          <input
            type="range"
            aria-label="Importance brush size"
            min=".01"
            max=".15"
            step=".005"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={showFaces}
            onChange={(e) => setShowFaces(e.target.checked)}
          />{" "}
          Show detected landmarks & edges
        </label>
        <div className="button-row">
          <button
            disabled={!project.importanceStrokes?.length}
            onClick={() => onChange(project.importanceStrokes!.slice(0, -1))}
          >
            Undo brush stroke
          </button>
          <button
            disabled={!project.importanceStrokes?.length}
            onClick={() => onChange([])}
          >
            Clear importance edits
          </button>
        </div>
        <p className="hint">
          Brush strokes stay attached to the original photo across crops and
          both art modes. “Simplify” reduces detail; it does not inpaint or
          remove an object.
        </p>
        {!a && (
          <p className="warning">
            Analyze the subject first to see the heatmap. Manual strokes still
            work.
          </p>
        )}
      </div>
      <div className="importance-canvas">
        <svg
          ref={svg}
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label="Importance map; drag to paint priority"
          onPointerDown={(e) => {
            active.current = true;
            setDraft([point(e)]);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (active.current) {
              const p = point(e);
              setDraft((d) => [...d, p]);
            }
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
        >
          <image
            href={project.image}
            width={w}
            height={h}
            preserveAspectRatio="none"
          />
          {heat && <image href={heat} width={w} height={h} />}
          {a && (
            <rect
              x={a.box.x * w}
              y={a.box.y * h}
              width={a.box.width * w}
              height={a.box.height * h}
              fill="none"
              stroke="#f6d88e"
              strokeWidth=".8"
              strokeDasharray="3 2"
            />
          )}
          {showFaces &&
            a?.faces.flatMap((face, f) =>
              [
                ...face.groups.eyes,
                ...face.groups.brows,
                face.groups.nose,
                face.groups.mouth,
                face.groups.oval,
              ].map((points, i) => (
                <polyline
                  key={`${f}-${i}`}
                  points={points.map((p) => `${p.x * w},${p.y * h}`).join(" ")}
                  fill="none"
                  stroke="#ffe9a2"
                  strokeWidth=".7"
                />
              )),
            )}
          {showFaces &&
            a?.edges.map((v, i) =>
              v > 0.7 && a.saliency[i] > 0.4 ? (
                <rect
                  key={i}
                  x={i % w}
                  y={Math.floor(i / w)}
                  width="1"
                  height="1"
                  fill="white"
                  opacity=".55"
                />
              ) : null,
            )}
          {draft.length > 0 && (
            <polyline
              points={draft.map((p) => `${p.x * w},${p.y * h}`).join(" ")}
              fill="none"
              stroke={brush > 0 ? "#ffd875" : "#70cce1"}
              strokeWidth={radius * Math.min(w, h) * 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".6"
            />
          )}
        </svg>
      </div>
    </section>
  );
}
