import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Upload,
  Download,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  RotateCw,
  Undo2,
  Redo2,
  Check,
  ShieldCheck,
  BookOpen,
  SlidersHorizontal,
  Flower2,
  Grid2X2,
  PenLine,
  FolderOpen,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Save,
  Leaf,
} from "lucide-react";
import {
  defaults,
  difficulty,
  letter,
  type Project,
  type Settings,
  type Palette,
  type Notebook,
  type Artwork,
} from "./types";
import paletteData from "./palettes.json";
import { sampleImage, loadImage, normalizeFile } from "./samples";
import {
  saveProject,
  getProjects,
  deleteProject,
  savePreference,
  getPreference,
  validateProject,
} from "./storage";
import { artworkSVG, download, editedArt, pngExport } from "./render";
import {
  printWarnings,
  geometry,
  regionsFor,
  simplifyRegions,
} from "./processing";
import {
  artworkPDF,
  keyPDF,
  calibrationPDF,
  protectivePDF,
  notebookZIP,
  guideSteps,
  estimatedCost,
  documentPDF,
} from "./export";
import { CropEditor } from "./CropEditor";
import { ImportanceEditor } from "./ImportanceEditor";
import { StrategyComparison } from "./StrategyComparison";
import { prepareInput, originalData } from "./input";
import { analyzeSource } from "./analysis";
import { priorities, portraitPreset } from "./features";
import { rotatePoint } from "./crop";
import type { SubjectKind } from "./subject-types";
import "./style.css";
const presentationKeys = new Set([
  "labels",
  "lineLabels",
  "diameter",
  "minDot",
  "guide",
  "thickness",
  "tip",
  "bleed",
]);
const variantKey = (p: Project, settings = p.settings) =>
  JSON.stringify([
    p.id,
    p.image,
    Object.fromEntries(
      Object.entries(settings).filter(([key]) => !presentationKeys.has(key)),
    ),
    p.palette,
    p.framing,
    p.analysis,
    p.importanceStrokes,
  ]);
const initialPalette: Palette = {
  name: paletteData.name,
  verified: false,
  paper: paletteData.paper,
  markers: paletteData.markers,
};
const makeProject = (name = "Wildflower study", kind = "Flowers"): Project => ({
  version: 1,
  id: crypto.randomUUID(),
  title: name,
  image: sampleImage(kind),
  settings: { ...defaults },
  palette: structuredClone(initialPalette),
  edits: {},
  updated: Date.now(),
});
const initialNotebook: Notebook = {
  title: "Little moments in color",
  pages: [],
  numbering: true,
  protective: "removable",
  paperGsm: 140,
  boardMm: 1.8,
  quantity: 1,
  paperCost: 0.2,
  coverCost: 0.5,
  boardCost: 0.75,
  plasticCost: 0.5,
  bindingCost: 1,
  laborCost: 3,
};
function App() {
  const [cropOpen, setCropOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisRequest, setAnalysisRequest] = useState(0);
  const lastAnalysisRequest = useRef(0);
  const [comparisons, setComparisons] = useState<Record<string, Artwork>>({});
  const [project, setProject] = useState<Project>(() => makeProject());
  const [tab, setTab] = useState("Create");
  const [preview, setPreview] = useState("Colored");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [saved, setSaved] = useState<Project[]>([]);
  const [notebook, setNotebook] = useState<Notebook>(initialNotebook);
  const [zoom, setZoom] = useState(1);
  const [paint, setPaint] = useState<number | null>(null);
  const [merge, setMerge] = useState(false);
  const [firstRegion, setFirstRegion] = useState<number | null>(null);
  const [past, setPast] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [calibrationSheet, setCalibrationSheet] = useState(1);
  const upload = useRef<HTMLInputElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    paletteInput = useRef<HTMLInputElement>(null),
    calibrationInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0),
    dragging = useRef(false);
  const s = project.settings;
  const art = editedArt(project);
  const warnings = art
    ? [...printWarnings(s, art), ...(art.diagnostics?.metrics.warnings || [])]
    : [];
  const settings = (patch: Partial<Settings>) => {
    setPaint(null);
    setPast([]);
    setFuture([]);
    setProject((p) => {
      const next = { ...p.settings, ...patch };
      const variants = { ...p.variants };
      if (patch.mode && p.art)
        variants[p.settings.mode] = {
          key: variantKey(p),
          art: p.art,
          edits: p.edits,
        };
      const cached = patch.mode ? variants[next.mode] : undefined;
      return {
        ...p,
        settings: next,
        variants,
        edits: Object.keys(patch).every((key) => presentationKeys.has(key))
          ? p.edits
          : cached?.key === variantKey(p, next)
            ? cached.edits
            : {},
      };
    });
  };
  const report = (e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
    setNotice("");
  };
  async function action(
    fn: () => Promise<unknown>,
    message = "Download ready",
  ) {
    setExporting(true);
    setError("");
    try {
      await fn();
      setNotice(message);
    } catch (e) {
      report(e);
    } finally {
      setExporting(false);
    }
  }
  useEffect(() => {
    Promise.all([
      getProjects(),
      getPreference("notebook"),
      getPreference("palette"),
    ])
      .then(([items, n, p]) => {
        setSaved(items);
        if (n) setNotebook(n);
        if (p) setProject((v) => ({ ...v, palette: p }));
        setReady(true);
      })
      .catch(report);
  }, []);
  useEffect(() => {
    if (ready) savePreference("notebook", notebook).catch(report);
  }, [notebook, ready]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const needed =
      project.cropReview ||
      s.priority !== "Color Accuracy" ||
      analysisRequest > 0 ||
      preview === "Importance" ||
      preview === "Strategies";
    if (
      !needed ||
      (project.analysis && lastAnalysisRequest.current === analysisRequest)
    )
      return;
    lastAnalysisRequest.current = analysisRequest;
    const controller = new AbortController(),
      id = project.id;
    setAnalysisStatus("Finding the main subject…");
    analyzeSource(project.image, controller.signal, setAnalysisStatus)
      .then((analysis) => {
        if (!controller.signal.aborted)
          setProject((p) => (p.id === id ? { ...p, analysis } : p));
      })
      .catch((e) => {
        if (e.name !== "AbortError") report(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAnalysisStatus("");
      });
    return () => {
      controller.abort();
      setAnalysisStatus("");
    };
  }, [
    project.id,
    project.image,
    analysisRequest,
    project.cropReview,
    s.priority,
    preview === "Importance" || preview === "Strategies",
  ]);
  useEffect(() => {
    if (project.cropReview) {
      setBusy(false);
      return;
    }
    const cached = project.variants?.[s.mode];
    if (cached?.key === variantKey(project) && preview !== "Strategies") {
      setProject((p) => ({ ...p, art: cached.art, edits: cached.edits }));
      setBusy(false);
      return;
    }
    let disposed = false;
    let worker: Worker | undefined;
    const job = ++revision.current;
    setBusy(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const input = await prepareInput(project);
        if (disposed) return;
        worker = new Worker(new URL("./processor.worker.ts", import.meta.url), {
          type: "module",
        });
        worker.onmessage = (e) => {
          if (disposed || job !== revision.current) return;
          if (e.data.error) report(e.data.error);
          else {
            setProject((p) => ({ ...p, art: e.data.art }));
            if (e.data.comparisons) setComparisons(e.data.comparisons);
          }
          setBusy(false);
          worker?.terminate();
        };
        worker.onerror = (e) => {
          if (!disposed) {
            report(e.message);
            setBusy(false);
          }
        };
        worker.postMessage(
          {
            ...input,
            settings: s,
            markers: project.palette.markers,
            analysis: project.analysis,
            strokes: project.importanceStrokes || [],
            compare: preview === "Strategies",
          },
          [input.data.buffer, input.baselineData.buffer],
        );
      } catch (e) {
        if (!disposed) {
          report(e);
          setBusy(false);
        }
      }
    }, 180);
    return () => {
      disposed = true;
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [variantKey(project), project.cropReview, preview === "Strategies"]);
  function edit(change: (p: Project) => Project) {
    setPast((v) => [...v.slice(-29), structuredClone(project)]);
    setFuture([]);
    setProject(change);
  }
  function undo() {
    if (!past.length) return;
    setFuture((v) => [project, ...v]);
    setProject(past[past.length - 1]);
    setPast((v) => v.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setPast((v) => [...v, project]);
    setProject(future[0]);
    setFuture((v) => v.slice(1));
  }
  async function save() {
    await saveProject({ ...project, updated: Date.now() });
    setSaved(await getProjects());
    setNotice("Project saved on this device");
  }
  async function handleUpload(file?: File) {
    if (!file) return;
    try {
      const [image, original] = await Promise.all([
        normalizeFile(file),
        originalData(file),
      ]);
      setProject((p) => ({
        ...p,
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, ""),
        image,
        originalFile: { name: file.name, type: file.type, data: original },
        framing: undefined,
        analysis: undefined,
        importanceStrokes: [],
        variants: undefined,
        cropReview: true,
        art: undefined,
        edits: {},
        settings: { ...p.settings, rotation: 0, crop: 1, cropX: 50, cropY: 50 },
      }));
      setPast([]);
      setFuture([]);
      setTab("Create");
      setCropOpen(true);
    } catch (e) {
      report(e);
    }
  }
  function open(p: Project) {
    const restored = {
      ...structuredClone(p),
      settings: { ...defaults, ...p.settings },
    };
    if (restored.art)
      restored.variants = {
        ...restored.variants,
        [restored.settings.mode]: {
          key: variantKey(restored),
          art: restored.art,
          edits: restored.edits,
        },
      };
    setProject(restored);
    setPast([]);
    setFuture([]);
    setPaint(null);
    setTab("Create");
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 150e6) throw Error("Project file is too large.");
      const value = JSON.parse(await file.text());
      if (value.notebook) {
        if (
          !Array.isArray(value.notebook.pages) ||
          !value.notebook.pages.every(
            (p: unknown) => validateProject(p) && !!p.art,
          )
        )
          throw Error("Invalid notebook backup.");
        setNotebook({ ...initialNotebook, ...value.notebook });
        setTab("Notebook Builder");
      } else {
        if (!validateProject(value))
          throw Error("Invalid project file or unsupported image.");
        open(value);
      }
      setNotice("Backup imported");
    } catch (e) {
      report(e);
    }
  }
  const updatePalette = (p: Palette) => {
    setProject((v) => ({ ...v, palette: p, edits: {} }));
    savePreference("palette", p).catch(report);
  };
  async function importPalette(file?: File) {
    if (!file) return;
    try {
      const p = JSON.parse(await file.text());
      if (
        typeof p.name !== "string" ||
        !Array.isArray(p.markers) ||
        !p.markers.length ||
        p.markers.length > 100 ||
        !p.markers.every((m: unknown) => {
          const v = m as { hex: string; name: string };
          return typeof v.name === "string" && /^#[a-f0-9]{6}$/i.test(v.hex);
        })
      )
        throw Error(
          "Use a palette JSON with a name and 1-100 markers, each with name and #RRGGBB hex.",
        );
      updatePalette({
        name: p.name,
        verified: false,
        paper: p.paper || "Unspecified paper",
        markers: p.markers.map((m: object, i: number) => ({
          ...m,
          id: `custom-${i}`,
          enabled: true,
        })),
      } as Palette);
      setNotice("Palette imported");
    } catch (e) {
      report(e);
    }
  }
  async function calibrate(file?: File) {
    if (!file) return;
    try {
      const src = await normalizeFile(file),
        img = await loadImage(src);
      const canvas = document.createElement("canvas");
      canvas.width = 540;
      canvas.height = 624;
      const c = canvas.getContext("2d")!;
      c.drawImage(img, 0, 0, 540, 624);
      const white = c.getImageData(3, 3, 12, 12).data;
      let ref = [0, 0, 0];
      for (let i = 0; i < white.length; i += 4)
        for (let k = 0; k < 3; k++) ref[k] += white[i + k] / (white.length / 4);
      const offset = (calibrationSheet - 1) * 40;
      const markers = project.palette.markers.map((m, i) => {
        if (i < offset || i >= offset + 40) return m;
        const j = i - offset,
          data = c.getImageData(
            (j % 5) * 108 + 41,
            Math.floor(j / 5) * 78 + 26,
            24,
            16,
          ).data;
        const channels: number[][] = [[], [], []];
        for (let n = 0; n < data.length; n += 4)
          for (let k = 0; k < 3; k++) channels[k].push(data[n + k]);
        const hex =
          "#" +
          channels
            .map((a, k) =>
              Math.round(
                Math.min(
                  255,
                  (a.sort((x, y) => x - y)[Math.floor(a.length / 2)] * 255) /
                    Math.max(80, ref[k]),
                ),
              )
                .toString(16)
                .padStart(2, "0"),
            )
            .join("");
        return { ...m, hex };
      });
      updatePalette({ ...project.palette, markers });
      setNotice("Swatches sampled. Review and correct each color before use.");
    } catch (e) {
      report(e);
    }
  }
  function clickArtwork(e: React.PointerEvent<HTMLDivElement>) {
    if (preview === "Original" || busy) return;
    const target = (e.target as Element).closest("[data-cell],[data-region]");
    if (!target) return;
    const id = Number(
      target.getAttribute(s.mode === "dots" ? "data-cell" : "data-region"),
    );
    if (merge && s.mode === "lines" && project.art) {
      if (firstRegion === null) {
        setFirstRegion(id);
        setNotice("Select an adjacent region to merge");
        return;
      }
      if (firstRegion === id) return;
      const a = project.art,
        one = a.regions.find((r) => r.id === firstRegion)!,
        two = a.regions.find((r) => r.id === id)!;
      const adjacent = new Set(two.cells);
      if (
        !one.cells.some((i) =>
          [
            i - a.width,
            i + a.width,
            ...(i % a.width ? [i - 1] : []),
            ...(i % a.width < a.width - 1 ? [i + 1] : []),
          ].some((j) => adjacent.has(j)),
        )
      ) {
        setError("Select a region sharing a boundary.");
        return;
      }
      edit((p) => {
        const assignments = [...p.art!.assignments];
        for (const r of editedArt(p)!.regions)
          r.cells.forEach((i) => (assignments[i] = r.color));
        two.cells.forEach(
          (i) => (assignments[i] = p.edits[firstRegion] ?? one.color),
        );
        return {
          ...p,
          edits: {},
          art: {
            ...p.art!,
            assignments,
            regions: simplifyRegions(
              regionsFor(assignments, a.width, a.height),
              a.width,
              a.height,
              s.simplification,
            ),
          },
        };
      });
      setFirstRegion(null);
      return;
    }
    if (paint !== null)
      edit((p) => ({ ...p, edits: { ...p.edits, [id]: paint } }));
    else {
      const n =
        s.mode === "dots" ? art!.assignments[id] : art!.regions[id].color;
      setNotice(
        n < 0
          ? "Uncolored paper"
          : `${letter(n)} — ${art!.palette[n].name}. Select a swatch to paint.`,
      );
    }
  }
  const exportAllowed = !!art && !busy && !exporting;
  const dotBlocked =
    s.mode === "dots" && !!art && printWarnings(s, art).length > 0;
  function ExportButtons() {
    return (
      <>
        <button
          className="primary full"
          disabled={!exportAllowed || dotBlocked}
          onClick={() =>
            action(async () =>
              download(
                await artworkPDF([project], preview === "Colored"),
                `${project.title}.pdf`,
              ),
            )
          }
        >
          <Download size={16} /> Download PDF
        </button>
        <div className="button-row">
          <button
            disabled={!exportAllowed || dotBlocked}
            onClick={() =>
              download(
                artworkSVG(project, preview === "Colored"),
                `${project.title}.svg`,
                "image/svg+xml",
              )
            }
          >
            SVG
          </button>
          <button
            disabled={!exportAllowed || dotBlocked}
            onClick={() =>
              action(() => pngExport(project, preview === "Colored"))
            }
          >
            PNG · 300 dpi
          </button>
        </div>
        <button
          className="text-button"
          disabled={!exportAllowed}
          onClick={() =>
            action(async () =>
              download(await keyPDF([project]), "color-key.pdf"),
            )
          }
        >
          Download color key <ChevronRight size={13} />
        </button>
        {s.mode === "lines" && (
          <button
            className="text-button"
            disabled={!exportAllowed}
            onClick={() =>
              action(async () =>
                download(
                  await artworkPDF([project], false, true),
                  "outlines-only.pdf",
                ),
              )
            }
          >
            Outlines-only PDF <ChevronRight size={13} />
          </button>
        )}
      </>
    );
  }
  const slider = (
    label: string,
    key: keyof Settings,
    min: number,
    max: number,
    step = 1,
    suffix = "",
  ) => (
    <label className="range-label">
      {label}
      <span>
        {String(s[key])}
        {suffix}
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(s[key])}
        onChange={(e) => settings({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  const number = (
    label: string,
    key: keyof Settings,
    min: number,
    max: number,
    step = 0.05,
  ) => (
    <label className="field">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(s[key])}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min && v <= max)
            settings({ [key]: v });
        }}
      />
    </label>
  );
  return (
    <>
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Create");
          }}
        >
          <span className="brand-mark">
            <Flower2 size={25} />
          </span>
          <span>
            paper <em>&</em> pigment<small>THE COLORING STUDIO</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            "Create",
            "My Projects",
            "Marker Sets",
            "Notebook Builder",
            "Manufacturing Guide",
          ].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        <span className="local-badge">
          <ShieldCheck size={15} /> Private by design
        </span>
      </header>
      <input
        ref={upload}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          handleUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={importInput}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => {
          importProject(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={paletteInput}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => {
          importPalette(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={calibrationInput}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => {
          calibrate(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {(notice || error) && (
        <div
          role={error ? "alert" : "status"}
          className={`toast ${error ? "error" : ""}`}
          onClick={() => {
            setNotice("");
            setError("");
          }}
        >
          {error || notice}
          <button aria-label="Dismiss message">×</button>
        </div>
      )}
      {tab === "Create" ? (
        <>
          <section className="workspace-heading">
            <div>
              <div className="eyebrow">MAKE SOMETHING SLOW & BEAUTIFUL</div>
              <h1>A photograph. A thousand little colors.</h1>
              <p>Turn a favorite moment into artwork you can make your own.</p>
            </div>
            <div className="heading-actions">
              <button
                onClick={() => action(save, "Project saved on this device")}
                disabled={busy}
              >
                <Save size={16} /> Save project
              </button>
              <button
                className="dark"
                disabled={!exportAllowed || dotBlocked}
                onClick={() => {
                  setNotebook((n) => ({
                    ...n,
                    pages: [
                      ...n.pages,
                      structuredClone({ ...project, id: crypto.randomUUID() }),
                    ],
                  }));
                  setNotice("Page added to your notebook");
                }}
              >
                <Plus size={16} /> Add to notebook
              </button>
            </div>
          </section>
          <main className="workspace">
            <aside className="controls">
              <section>
                <div className="section-title">
                  <span className="step">01</span>
                  <h2>Your photograph</h2>
                </div>
                <button
                  className="upload-card"
                  onClick={() => upload.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleUpload(e.dataTransfer.files[0]);
                  }}
                >
                  <img src={project.image} alt="Current source" />
                  <div>
                    <strong>Choose a photo</strong>
                    <small>or drop it here · JPG, PNG, WebP</small>
                  </div>
                  <Upload size={16} />
                </button>
                <div className="sample-row">
                  <span>Try a study</span>
                  {["Flowers", "Animal", "Landscape", "Portrait"].map((k) => (
                    <button
                      title={`Load ${k.toLowerCase()} sample`}
                      aria-label={`Load ${k.toLowerCase()} sample`}
                      key={k}
                      onClick={() => {
                        const p = makeProject(`${k} study`, k);
                        setProject({ ...p, palette: project.palette });
                        setPast([]);
                      }}
                    >
                      {k === "Flowers"
                        ? "✿"
                        : k === "Animal"
                          ? "♧"
                          : k === "Landscape"
                            ? "△"
                            : "◉"}
                    </button>
                  ))}
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    (() => {
                      setProject((p) => {
                        const next = p.framing
                          ? rotatePoint(
                              { x: p.framing.cx, y: p.framing.cy },
                              90,
                            )
                          : undefined;
                        return {
                          ...p,
                          settings: {
                            ...p.settings,
                            rotation: (p.settings.rotation + 90) % 360,
                          },
                          framing: next
                            ? { ...p.framing!, cx: next.x, cy: next.y }
                            : undefined,
                          edits: {},
                          variants: undefined,
                        };
                      });
                    })()
                  }
                >
                  <RotateCw size={13} /> Rotate 90°
                </button>
                <button className="full" onClick={() => setCropOpen(true)}>
                  Crop & reframe
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setCropOpen(true);
                    setAnalysisRequest((n) => n + 1);
                  }}
                >
                  Suggest a subject-focused crop
                </button>
                <p className="hint">
                  Drag the frame, resize, or nudge in any direction—even at 1×
                  with paper margins enabled.
                </p>
                {project.analysis && (
                  <p className="subject-summary">
                    {project.analysis.kind} · {project.analysis.method}
                    <small>{project.analysis.message}</small>
                  </p>
                )}
              </section>
              <section>
                <div className="section-title">
                  <span className="step">02</span>
                  <h2>Make it your style</h2>
                </div>
                <div className="mode-switch">
                  <button
                    className={s.mode === "dots" ? "selected" : ""}
                    onClick={() => settings({ mode: "dots" })}
                  >
                    <Grid2X2 size={17} /> Dot Art
                  </button>
                  <button
                    className={s.mode === "lines" ? "selected" : ""}
                    onClick={() => settings({ mode: "lines" })}
                  >
                    <PenLine size={17} /> Line Art
                  </button>
                </div>
                <p className="hint">
                  {s.mode === "dots"
                    ? "Little letters. Colorful dots. One lovely reveal."
                    : "Enclosed shapes, ready for your brush-tip markers."}
                </p>
                <label className="field">
                  Conversion priority
                  <select
                    aria-label="Conversion priority"
                    value={s.priority}
                    onChange={(e) =>
                      settings({
                        priority: e.target.value as Settings["priority"],
                      })
                    }
                  >
                    {priorities.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="text-button"
                  onClick={() => settings(portraitPreset)}
                >
                  Portrait optimization preset
                </button>
                <p className="hint">
                  Feature-aware choices prioritize observed structure. Your
                  grid, difficulty and marker limit stay unchanged.
                </p>
                <label className="field">
                  Difficulty
                  <select
                    aria-label="Difficulty"
                    value={s.difficulty}
                    onChange={(e) =>
                      settings({
                        difficulty: e.target.value,
                        ...difficulty[e.target.value],
                      })
                    }
                  >
                    {Object.keys(difficulty).map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                {s.mode === "dots" ? (
                  <>
                    <label className="field">
                      Grid resolution
                      <select
                        aria-label="Grid resolution"
                        value={
                          [24, 36, 48, 60].includes(s.columns)
                            ? s.columns
                            : "custom"
                        }
                        onChange={(e) => {
                          if (e.target.value === "custom")
                            settings({ columns: 40 });
                          else settings({ columns: Number(e.target.value) });
                        }}
                      >
                        <option value="24">Low · 24 columns</option>
                        <option value="36">Medium · 36 columns</option>
                        <option value="48">High · 48 columns</option>
                        <option value="60">Ultra · 60 columns</option>
                        <option value="custom">Custom</option>
                      </select>
                    </label>
                    {number("Columns", "columns", 12, 100, 1)}
                    <p className="hint">
                      Rows adapt to the printable area. Difficulty never changes
                      the grid.
                    </p>
                  </>
                ) : (
                  <>
                    <label className="field">
                      Coloring style
                      <select
                        aria-label="Coloring style"
                        value={s.lineLabels ? "numbered" : "traditional"}
                        onChange={(e) =>
                          settings({
                            lineLabels: e.target.value === "numbered",
                          })
                        }
                      >
                        <option value="numbered">Color by letter</option>
                        <option value="traditional">
                          Traditional · no labels
                        </option>
                      </select>
                    </label>
                    {slider("Output detail", "lineDetail", 48, 160, 8)}
                    {slider(
                      "Small-region cleanup (cells)",
                      "minRegion",
                      3,
                      100,
                    )}
                    {slider("Minimum fill area", "regionMm2", 1, 60, 1, " mm²")}
                    {slider(
                      "Contour simplification",
                      "simplification",
                      0,
                      1,
                      0.05,
                    )}
                    {slider(
                      "Outline thickness",
                      "thickness",
                      0.3,
                      2,
                      0.1,
                      " pt",
                    )}
                  </>
                )}
                {slider("Maximum colors", "colors", 2, 18)}
                <div className="tips">
                  <Leaf size={16} />
                  <span>
                    {s.colors} colors, a little creative pause.
                    <small>{s.tip} selected · either mode is available.</small>
                  </span>
                </div>
              </section>
              <section>
                <div className="section-title">
                  <span className="step">03</span>
                  <h2>Make it yours</h2>
                </div>
                <button
                  className="disclosure"
                  onClick={() => setAdvanced(!advanced)}
                >
                  <SlidersHorizontal size={15} /> Advanced settings
                  <span>{advanced ? "−" : "+"}</span>
                </button>
                {advanced && (
                  <div className="advanced">
                    <h3>Feature-aware simplification</h3>
                    <label className="field">
                      Main subject
                      <select
                        aria-label="Main subject"
                        value={s.subjectKind}
                        onChange={(e) =>
                          settings({
                            subjectKind: e.target.value as SubjectKind,
                          })
                        }
                      >
                        {[
                          "Auto",
                          "Portrait",
                          "Animal",
                          "Flower / plant",
                          "Building",
                          "Landscape",
                          "General object",
                        ].map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                    </label>
                    {slider(
                      "Feature preservation strength",
                      "featureStrength",
                      0,
                      100,
                    )}
                    {slider(
                      "Background simplification",
                      "backgroundSimplification",
                      0,
                      100,
                    )}
                    {slider("Edge emphasis", "edgeEmphasis", 0, 100)}
                    {slider(
                      "Local contrast enhancement",
                      "localContrast",
                      0,
                      100,
                    )}
                    {slider("Texture removal", "textureRemoval", 0, 100)}
                    <label className="field">
                      Facial detail priority
                      <select
                        value={s.facialDetail}
                        onChange={(e) =>
                          settings({
                            facialDetail: e.target
                              .value as Settings["facialDetail"],
                          })
                        }
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </label>
                    {slider(
                      "Minimum important feature size",
                      "minFeatureSize",
                      0.5,
                      3,
                      0.1,
                      " cells",
                    )}
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={s.preserveHair}
                        onChange={(e) =>
                          settings({ preserveHair: e.target.checked })
                        }
                      />{" "}
                      Preserve observed hair-silhouette edges
                    </label>
                    <p className="hint">
                      These controls affect Balanced and feature-aware
                      conversions. Color Accuracy keeps the original pipeline.
                      Hair and ears are not facial landmarks; only existing edge
                      evidence is protected.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setPreview("Importance")}
                    >
                      Edit importance map
                    </button>

                    {slider("Brightness", "brightness", -60, 60)}
                    {slider("Contrast", "contrast", 0.5, 1.8, 0.1)}
                    {slider("Saturation", "saturation", 0, 2, 0.1)}
                    {slider("Denoising / smoothing", "smoothing", 0, 4)}
                    {slider("Edge preservation", "edgePreservation", 10, 95)}
                    <label className="field">
                      Border background
                      <select
                        aria-label="Border background"
                        value={s.background}
                        onChange={(e) =>
                          settings({
                            background: e.target
                              .value as Settings["background"],
                          })
                        }
                      >
                        <option value="keep">Keep background</option>
                        <option value="simplify">
                          Simplify small border regions
                        </option>
                        <option value="remove">
                          Remove largest border-connected region
                        </option>
                      </select>
                    </label>
                    <p className="hint">
                      Background detection uses border connectivity, not subject
                      recognition. Check subjects that touch the image edge.
                    </p>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={s.white}
                        onChange={(e) => settings({ white: e.target.checked })}
                      />{" "}
                      Leave white paper uncolored
                    </label>
                    {s.mode === "dots" && (
                      <>
                        {slider("Dot diameter", "diameter", 0.8, 5, 0.1, " mm")}
                        {number(
                          "Minimum usable dot (mm)",
                          "minDot",
                          0.5,
                          5,
                          0.1,
                        )}
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={s.stagger}
                            onChange={(e) =>
                              settings({ stagger: e.target.checked })
                            }
                          />{" "}
                          Staggered grid
                        </label>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={s.dither}
                            onChange={(e) =>
                              settings({ dither: e.target.checked })
                            }
                          />{" "}
                          Error-diffusion dithering
                        </label>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={s.labels}
                            onChange={(e) =>
                              settings({ labels: e.target.checked })
                            }
                          />{" "}
                          Print guide letters
                        </label>
                        <label className="field">
                          Guide style
                          <select
                            value={s.guide}
                            onChange={(e) =>
                              settings({
                                guide: e.target.value as Settings["guide"],
                              })
                            }
                          >
                            <option value="letters">
                              Letters only · reference style
                            </option>
                            <option value="circles">
                              Letters inside circles
                            </option>
                          </select>
                        </label>
                      </>
                    )}
                    <label className="field">
                      Marker tip
                      <select
                        value={s.tip}
                        onChange={(e) => settings({ tip: e.target.value })}
                      >
                        <option>Fine tip</option>
                        <option>Brush tip</option>
                      </select>
                    </label>
                    <h3>Physical page</h3>
                    <div className="two-col">
                      {number("Width (in)", "width", 3, 12)}
                      {number("Height (in)", "height", 3, 17)}
                      {number("Safe margin (in)", "margin", 0.15, 0.6)}
                      {number("Top binding (in)", "binding", 0.3, 0.9)}
                    </div>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!!s.bleed}
                        onChange={(e) =>
                          settings({ bleed: e.target.checked ? 0.125 : 0 })
                        }
                      />{" "}
                      Add 0.125″ bleed / trim marks
                    </label>
                    <button
                      className="text-button"
                      onClick={() => settings({ ...defaults })}
                    >
                      Reset to defaults
                    </button>
                  </div>
                )}
              </section>
              <div className="privacy">
                <ShieldCheck size={17} />
                <p>
                  Your photos are processed in your browser and are not uploaded
                  to our servers.
                </p>
              </div>
            </aside>
            <section className="preview-area">
              <div className="preview-toolbar">
                <div className="preview-tabs">
                  {[
                    "Original",
                    "Template",
                    "Colored",
                    "Compare",
                    "Importance",
                    "Strategies",
                  ].map((v) => (
                    <button
                      className={preview === v ? "active" : ""}
                      key={v}
                      onClick={() => setPreview(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="undo">
                  <button
                    title="Undo edit"
                    aria-label="Undo edit"
                    disabled={!past.length}
                    onClick={undo}
                  >
                    <Undo2 size={15} />
                  </button>
                  <button
                    title="Redo edit"
                    aria-label="Redo edit"
                    disabled={!future.length}
                    onClick={redo}
                  >
                    <Redo2 size={15} />
                  </button>
                </div>
              </div>
              <div className="preview-meta">
                <span>
                  <i className={busy ? "working" : ""} />
                  {analysisStatus ||
                    (busy
                      ? "Preparing your artwork…"
                      : "Your little masterpiece, in the making")}
                </span>
                <span>
                  {s.width} × {s.height} IN
                </span>
              </div>
              {preview === "Importance" ? (
                <ImportanceEditor
                  project={project}
                  onChange={(strokes) => {
                    setProject((p) => ({
                      ...p,
                      importanceStrokes: strokes,
                      variants: undefined,
                      edits: {},
                    }));
                  }}
                />
              ) : preview === "Strategies" ? (
                <StrategyComparison
                  project={project}
                  comparisons={comparisons}
                  busy={busy}
                  onProof={() =>
                    action(async () =>
                      download(
                        await artworkPDF(
                          priorities.slice(0, 3).map((priority) => ({
                            ...project,
                            title: project.title + " - " + priority,
                            settings: { ...s, priority },
                            art: comparisons[priority],
                            edits: {},
                          })),
                          true,
                        ),
                        "strategy-comparison-proof.pdf",
                      ),
                    )
                  }
                />
              ) : (
                <>
                  <div
                    className={`canvas-stage ${preview === "Compare" ? "compare" : ""}`}
                  >
                    <div
                      className="paper-wrap"
                      style={{ width: `${Math.round(350 * zoom)}px` }}
                    >
                      <div className="spiral" aria-hidden="true">
                        {Array.from({ length: 12 }, (_, i) => (
                          <i key={i} />
                        ))}
                      </div>
                      <div
                        className="paper"
                        style={{ aspectRatio: `${s.width}/${s.height}` }}
                      >
                        {preview === "Original" ? (
                          <img
                            className="original"
                            src={project.image}
                            alt="Original photograph"
                            style={{ transform: `rotate(${s.rotation}deg)` }}
                          />
                        ) : (
                          <div
                            className={`artwork ${paint !== null ? "paint" : ""}`}
                            onPointerDown={(e) => {
                              dragging.current = true;
                              clickArtwork(e);
                            }}
                            onPointerUp={() => (dragging.current = false)}
                            onPointerLeave={() => (dragging.current = false)}
                            onPointerMove={(e) => {
                              if (
                                dragging.current &&
                                s.mode === "dots" &&
                                paint !== null
                              )
                                clickArtwork(e);
                            }}
                            dangerouslySetInnerHTML={{
                              __html: artworkSVG(
                                project,
                                preview === "Colored" || preview === "Compare",
                              ),
                            }}
                          />
                        )}
                      </div>
                      <div className="paper-caption">
                        {project.title}{" "}
                        <span>
                          •{" "}
                          {preview === "Original"
                            ? "Source photograph"
                            : preview === "Template"
                              ? "Printable template"
                              : "Colored simulation"}
                        </span>
                      </div>
                    </div>
                    {preview === "Compare" && (
                      <div
                        className="paper-wrap"
                        style={{ width: `${Math.round(350 * zoom)}px` }}
                      >
                        <div
                          className="paper"
                          dangerouslySetInnerHTML={{
                            __html: artworkSVG(project, false),
                          }}
                        />
                        <div className="paper-caption">
                          Your printable template
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div className="canvas-bottom">
                <div className="zoom">
                  <button
                    aria-label="Zoom out"
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button onClick={() => setZoom(1)}>
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    aria-label="Zoom in"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>
                <span>Scroll to pan when zoomed · print at 100% scale</span>
              </div>
            </section>
            <aside className="details">
              <section>
                <label className="field project-title-field">
                  Artwork title
                  <input
                    aria-label="Artwork title"
                    value={project.title}
                    onChange={(e) =>
                      setProject((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </label>
                <div className="section-title">
                  <h2>Your color story</h2>
                  <span className="count">{art?.palette.length || 0} INKS</span>
                </div>
                <div className="palette-name">
                  Your marker collection <span>Fine + brush</span>
                </div>
                <p className="unverified">
                  {project.palette.name}.{" "}
                  {project.palette.verified
                    ? "User-verified palette."
                    : "Unverified demo colors — calibrate before matching physical markers."}
                </p>
                <div className="legend">
                  {art?.palette.map((m, i) => (
                    <button
                      className={paint === i ? "chosen" : ""}
                      key={m.id}
                      onClick={() => {
                        setPaint(paint === i ? null : i);
                        setMerge(false);
                      }}
                    >
                      <span className="swatch" style={{ background: m.hex }} />
                      <strong>{letter(i)}</strong>
                      <span>
                        {m.name}
                        <small>{m.code || "Custom / unverified"}</small>
                      </span>
                      {paint === i && <Check size={14} />}
                    </button>
                  ))}
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("Marker Sets")}
                >
                  Edit & calibrate marker set <ChevronRight size={13} />
                </button>
              </section>
              <section>
                <h2>Finishing touches</h2>
                <p className="hint">
                  Select a color above, then click{" "}
                  {s.mode === "dots" ? "or drag across dots" : "a region"} to
                  recolor.{" "}
                  {paint !== null
                    ? "Painting is on."
                    : "Click artwork to inspect its color."}
                </p>
                <div className="button-row">
                  <button
                    className={paint === -1 ? "selected" : ""}
                    onClick={() => {
                      setPaint(paint === -1 ? null : -1);
                      setMerge(false);
                    }}
                  >
                    Leave blank
                  </button>
                  <button
                    onClick={() => {
                      setPaint(null);
                      setMerge(false);
                    }}
                  >
                    Inspect
                  </button>
                </div>
                {s.mode === "lines" && (
                  <button
                    className={merge ? "selected full" : "full"}
                    onClick={() => {
                      setMerge(!merge);
                      setFirstRegion(null);
                      setPaint(null);
                    }}
                  >
                    {merge
                      ? "Select two adjacent regions"
                      : "Merge regions / remove boundary"}
                  </button>
                )}
              </section>
              <section>
                <h2>Ready for paper</h2>
                <dl>
                  <div>
                    <dt>
                      {s.mode === "dots" ? "Coloring dots" : "Color regions"}
                    </dt>
                    <dd>
                      {art
                        ? (s.mode === "dots"
                            ? art.assignments.filter((i) => i >= 0).length
                            : art.regions.length
                          ).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Finished size</dt>
                    <dd>
                      {s.width} × {s.height} in
                    </dd>
                  </div>
                  <div>
                    <dt>Binding</dt>
                    <dd>Top spiral</dd>
                  </div>
                  <div>
                    <dt>Guide size</dt>
                    <dd>
                      {art
                        ? `${s.mode === "dots" ? geometry(s, art.width, art.height).font.toFixed(1) : "5.0"} pt`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {warnings.map((w) => (
                  <p className="warning" key={w}>
                    {w}
                  </p>
                ))}
                <ExportButtons />
                <p className="hint center">
                  {preview === "Colored"
                    ? "Exports the colored simulation."
                    : "Exports the printable template."}
                  <br />
                  Proof your paper and markers before printing a full set.
                </p>
              </section>
            </aside>
          </main>
        </>
      ) : null}
      {tab === "My Projects" && (
        <main className="page-content">
          <div className="page-title">
            <div className="eyebrow">YOUR PERSONAL COLLECTION</div>
            <h1>A shelf of little possibilities.</h1>
            <p>
              Saved on this device. Export backups before clearing browser
              storage.
            </p>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => importInput.current?.click()}
              >
                <FolderOpen size={16} /> Import project or notebook
              </button>
              <button onClick={() => action(save, "Project saved")}>
                Save current project
              </button>
            </div>
          </div>
          <div className="project-grid">
            {saved.length ? (
              saved.map((p) => (
                <article className="project-card" key={p.id}>
                  <button className="project-preview" onClick={() => open(p)}>
                    {p.art ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: artworkSVG(p, true),
                        }}
                      />
                    ) : (
                      <img src={p.image} alt={p.title} />
                    )}
                  </button>
                  <h2>{p.title}</h2>
                  <p>
                    {p.settings.mode === "dots" ? "Dot Art" : "Line Art"} ·{" "}
                    {p.settings.difficulty} ·{" "}
                    {new Date(p.updated).toLocaleDateString()}
                  </p>
                  <div className="button-row">
                    <button onClick={() => open(p)}>Open</button>
                    <button
                      title="Duplicate project"
                      onClick={() =>
                        action(async () => {
                          await saveProject({
                            ...p,
                            id: crypto.randomUUID(),
                            title: p.title + " copy",
                            updated: Date.now(),
                          });
                          setSaved(await getProjects());
                        }, "Project duplicated")
                      }
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      title="Export project backup"
                      onClick={() =>
                        download(
                          JSON.stringify(p),
                          `${p.title}.json`,
                          "application/json",
                        )
                      }
                    >
                      <Download size={14} />
                    </button>
                    <button
                      title="Delete saved project"
                      onClick={() => {
                        if (confirm(`Delete "${p.title}" from this device?`))
                          action(async () => {
                            await deleteProject(p.id);
                            setSaved(await getProjects());
                          }, "Project deleted");
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">
                <FolderOpen size={36} />
                <h2>Your collection starts here.</h2>
                <p>
                  Create a page, then save it to keep its photo, settings and
                  edits.
                </p>
                <button onClick={() => setTab("Create")}>
                  Back to the studio
                </button>
              </div>
            )}
          </div>
        </main>
      )}
      {tab === "Marker Sets" && (
        <main className="page-content">
          <div className="page-title">
            <div className="eyebrow">FROM SCREEN TO REAL INK</div>
            <h1>Meet your colors.</h1>
            <p>Make a palette that belongs to the markers on your desk.</p>
          </div>
          <div className="marker-layout">
            <section className="card">
              <h2>Ohuhu Maui · 60-color dual-tip set</h2>
              <p>
                Water-based markers with fine and brush tips. Product identity
                is from your supplied retailer link; official color codes and
                ink values have not been independently verified.
              </p>
              <a
                className="link"
                href={paletteData.purchase}
                target="_blank"
                rel="noreferrer"
              >
                View the product at Target ↗
              </a>
              <div className="warning">{paletteData.note}</div>
              <label className="field">
                Your collection name
                <input
                  value={project.palette.name}
                  onChange={(e) =>
                    updatePalette({ ...project.palette, name: e.target.value })
                  }
                />
              </label>
              <label className="field">
                Paper / calibration profile
                <input
                  value={project.palette.paper}
                  onChange={(e) =>
                    updatePalette({ ...project.palette, paper: e.target.value })
                  }
                />
              </label>
              <div className="button-row">
                <button onClick={() => paletteInput.current?.click()}>
                  Import palette JSON
                </button>
                <button
                  onClick={() =>
                    download(
                      JSON.stringify(project.palette, null, 2),
                      "marker-palette.json",
                      "application/json",
                    )
                  }
                >
                  Export palette
                </button>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  updatePalette({
                    ...project.palette,
                    markers: [
                      ...project.palette.markers,
                      {
                        id: crypto.randomUUID(),
                        name: "My marker",
                        hex: "#808080",
                        enabled: true,
                      },
                    ],
                  })
                }
              >
                <Plus size={14} /> Add a marker
              </button>
            </section>
            <section className="card">
              <h2>Calibrate on your paper</h2>
              <ol className="instructions">
                <li>Download the blank calibration chart and print at 100%.</li>
                <li>
                  Fill each box with its matching physical marker. Enter its
                  real identifier below.
                </li>
                <li>
                  Scan flat, evenly lit, and crop precisely to the outer frame.
                  Perspective correction is not automatic.
                </li>
                <li>
                  Choose the chart sheet, upload the cropped scan, then review
                  each sampled swatch.
                </li>
              </ol>
              <button
                onClick={() =>
                  action(async () =>
                    download(
                      await calibrationPDF(project.palette),
                      "marker-swatch-calibration.pdf",
                    ),
                  )
                }
              >
                <Download size={15} /> Blank calibration chart
              </button>
              <label className="field">
                Chart sheet
                <select
                  value={calibrationSheet}
                  onChange={(e) => setCalibrationSheet(Number(e.target.value))}
                >
                  {Array.from(
                    { length: Math.ceil(project.palette.markers.length / 40) },
                    (_, i) => (
                      <option key={i} value={i + 1}>
                        Sheet {i + 1}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button
                className="primary"
                onClick={() => calibrationInput.current?.click()}
              >
                <Upload size={15} /> Sample cropped scan
              </button>
              <p className="hint">
                Median sampling with white-reference correction. Digital values
                remain approximate; always compare a physical proof.
              </p>
            </section>
          </div>
          <div className="swatch-grid">
            {project.palette.markers.map((m, i) => (
              <div className="marker-editor" key={m.id}>
                <input
                  aria-label={`Enable ${m.name}`}
                  type="checkbox"
                  checked={m.enabled}
                  onChange={(e) =>
                    updatePalette({
                      ...project.palette,
                      markers: project.palette.markers.map((v, j) =>
                        i === j ? { ...v, enabled: e.target.checked } : v,
                      ),
                    })
                  }
                />
                <input
                  aria-label={`Swatch ${m.name}`}
                  type="color"
                  value={m.hex}
                  onChange={(e) =>
                    updatePalette({
                      ...project.palette,
                      markers: project.palette.markers.map((v, j) =>
                        i === j ? { ...v, hex: e.target.value } : v,
                      ),
                    })
                  }
                />
                <div>
                  <input
                    aria-label={`Marker ${i + 1} name`}
                    value={m.name}
                    onChange={(e) =>
                      updatePalette({
                        ...project.palette,
                        markers: project.palette.markers.map((v, j) =>
                          i === j ? { ...v, name: e.target.value } : v,
                        ),
                      })
                    }
                  />
                  <input
                    aria-label={`Marker ${i + 1} manufacturer code`}
                    placeholder="Manufacturer code (if known)"
                    value={m.code || ""}
                    onChange={(e) =>
                      updatePalette({
                        ...project.palette,
                        markers: project.palette.markers.map((v, j) =>
                          i === j ? { ...v, code: e.target.value } : v,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
      {tab === "Notebook Builder" && (
        <main className="page-content">
          <div className="page-title">
            <div className="eyebrow">YOUR ART, BOUND TOGETHER</div>
            <h1>A small book. Made by you.</h1>
            <p>
              Mix dot art and line art. Every page keeps its own settings,
              colors and edits.
            </p>
          </div>
          <div className="notebook-layout">
            <section>
              <div className="card">
                <label className="field">
                  Notebook title
                  <input
                    value={notebook.title}
                    onChange={(e) =>
                      setNotebook((n) => ({ ...n, title: e.target.value }))
                    }
                  />
                </label>
                <div className="button-row">
                  <button
                    disabled={!exportAllowed || dotBlocked}
                    onClick={() =>
                      setNotebook((n) => ({
                        ...n,
                        pages: [
                          ...n.pages,
                          structuredClone({
                            ...project,
                            id: crypto.randomUUID(),
                          }),
                        ],
                      }))
                    }
                  >
                    <Plus size={15} /> Add current artwork
                  </button>
                  <button onClick={() => importInput.current?.click()}>
                    Import notebook
                  </button>
                </div>
              </div>
              {notebook.pages.map((p, i) => (
                <article className="notebook-page" key={p.id}>
                  <span className="page-index">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    className="mini-paper"
                    dangerouslySetInnerHTML={{ __html: artworkSVG(p, true) }}
                  />
                  <div className="page-info">
                    <input
                      aria-label={`Page ${i + 1} title`}
                      value={p.title}
                      onChange={(e) =>
                        setNotebook((n) => ({
                          ...n,
                          pages: n.pages.map((v, j) =>
                            j === i ? { ...v, title: e.target.value } : v,
                          ),
                        }))
                      }
                    />
                    <p>
                      {p.settings.mode === "dots" ? "Dot Art" : "Line Art"} ·{" "}
                      {p.settings.difficulty} · {p.art?.palette.length} colors
                    </p>
                    <button
                      className="text-button"
                      onClick={() => {
                        open(p);
                        setNotice(
                          "Edit the page, then use Replace notebook page to apply changes.",
                        );
                      }}
                    >
                      Edit this page
                    </button>
                    <button
                      className="text-button"
                      disabled={busy || dotBlocked || project.id !== p.id}
                      onClick={() =>
                        setNotebook((n) => ({
                          ...n,
                          pages: n.pages.map((v) =>
                            v.id === p.id ? structuredClone(project) : v,
                          ),
                        }))
                      }
                    >
                      Replace notebook page with current edits
                    </button>
                  </div>
                  <div className="page-actions">
                    <button
                      aria-label={`Move page ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() =>
                        setNotebook((n) => {
                          const pages = [...n.pages];
                          [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]];
                          return { ...n, pages };
                        })
                      }
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      aria-label={`Move page ${i + 1} down`}
                      disabled={i === notebook.pages.length - 1}
                      onClick={() =>
                        setNotebook((n) => {
                          const pages = [...n.pages];
                          [pages[i], pages[i + 1]] = [pages[i + 1], pages[i]];
                          return { ...n, pages };
                        })
                      }
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      aria-label={`Duplicate page ${i + 1}`}
                      onClick={() =>
                        setNotebook((n) => {
                          const pages = [...n.pages];
                          pages.splice(i + 1, 0, {
                            ...structuredClone(p),
                            id: crypto.randomUUID(),
                          });
                          return { ...n, pages };
                        })
                      }
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      aria-label={`Remove page ${i + 1}`}
                      onClick={() =>
                        setNotebook((n) => ({
                          ...n,
                          pages: n.pages.filter((_, j) => i !== j),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
              {!notebook.pages.length && (
                <div className="empty">
                  <BookOpen size={38} />
                  <h2>Room for your favorite moments.</h2>
                  <p>Add your current artwork to begin a notebook.</p>
                </div>
              )}
            </section>
            <aside className="card notebook-spec">
              <h2>The finishing details</h2>
              <label className="check">
                <input
                  type="checkbox"
                  checked={notebook.numbering}
                  onChange={(e) =>
                    setNotebook((n) => ({ ...n, numbering: e.target.checked }))
                  }
                />{" "}
                Page numbering
              </label>
              <label className="field">
                Protective sheet
                <select
                  value={notebook.protective}
                  onChange={(e) =>
                    setNotebook((n) => ({
                      ...n,
                      protective: e.target.value as Notebook["protective"],
                    }))
                  }
                >
                  <option value="removable">Removable reusable insert</option>
                  <option value="bound">Bound-in · confirm mechanics</option>
                </select>
              </label>
              {(["paperGsm", "boardMm", "quantity"] as const).map((key) => (
                <label className="field" key={key}>
                  {key === "paperGsm"
                    ? "Uncoated paper (gsm)"
                    : key === "boardMm"
                      ? "Chipboard thickness (mm)"
                      : "Quantity for estimate"}
                  <input
                    type="number"
                    min={key === "boardMm" ? 0.5 : 1}
                    step={key === "boardMm" ? 0.1 : 1}
                    max={key === "quantity" ? 10000 : 500}
                    value={notebook[key]}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0)
                        setNotebook((n) => ({ ...n, [key]: value }));
                    }}
                  />
                </label>
              ))}
              <p className="hint">
                Prototype specs: 120–160 gsm paper, 1.5–2 mm board, top spiral /
                Wire-O. Verify stock, binding, bleed and insert fit with your
                printer.
              </p>
              <h3>Editable cost assumptions · USD</h3>
              {(
                [
                  "paperCost",
                  "coverCost",
                  "boardCost",
                  "plasticCost",
                  "bindingCost",
                  "laborCost",
                ] as const
              ).map((key, i) => (
                <label className="cost-row" key={key}>
                  {
                    [
                      "Paper / printed sheet",
                      "Cover",
                      "Backing board",
                      "Protective insert",
                      "Binding",
                      "Cutting & assembly",
                    ][i]
                  }
                  <input
                    type="number"
                    min="0"
                    step=".05"
                    value={notebook[key]}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 0)
                        setNotebook((n) => ({ ...n, [key]: value }));
                    }}
                  />
                </label>
              ))}
              <dl>
                <div>
                  <dt>Estimated unit cost</dt>
                  <dd>${estimatedCost(notebook).toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Estimated total</dt>
                  <dd>
                    ${(estimatedCost(notebook) * notebook.quantity).toFixed(2)}
                  </dd>
                </div>
              </dl>
              <p className="hint">
                Your assumptions, not supplier quotations. Tax, shipping and
                waste are not included.
              </p>
              <button
                className="primary full"
                disabled={!notebook.pages.length || exporting}
                onClick={() =>
                  action(
                    () => notebookZIP(notebook),
                    "Manufacturing package downloaded",
                  )
                }
              >
                <Download size={16} />
                {exporting ? "Preparing files…" : "Download manufacturing ZIP"}
              </button>
              <button
                className="text-button"
                onClick={() =>
                  download(
                    JSON.stringify({ version: 1, notebook }),
                    `${notebook.title}.json`,
                    "application/json",
                  )
                }
              >
                Export notebook backup
              </button>
              <p className="hint">
                10 files: interior, cover, backing, protective sheet, keys,
                calibration chart, colored preview, guide, bill of materials and
                project backup.
              </p>
            </aside>
          </div>
        </main>
      )}
      {tab === "Manufacturing Guide" && (
        <main className="page-content">
          <div className="page-title">
            <div className="eyebrow">FROM PIXELS TO PAPER</div>
            <h1>Make something you can hold.</h1>
            <p>
              A practical guide to your first spiral-bound coloring notebook.
            </p>
          </div>
          <div className="guide-grid">
            <section className="card">
              <h2>A thoughtfully simple stack</h2>
              <div className="stack-diagram">
                {[
                  "Front cover",
                  "Instruction card",
                  "Single-sided artwork",
                  "Moveable PP / PET insert",
                  "Color key",
                  "Rigid chipboard backing",
                ].map((t, i) => (
                  <div
                    key={t}
                    style={{
                      marginLeft: i * 9,
                      background: [
                        "#eee2cc",
                        "#faf8f0",
                        "#fff",
                        "#d9ebe5",
                        "#f5f0e5",
                        "#b9a488",
                      ][i],
                    }}
                  >
                    <span>{i + 1}</span>
                    {t}
                  </div>
                ))}
              </div>
              <p className="hint">
                Top spiral or Wire-O through the approved binding area. Insert
                the protective sheet directly under the active artwork, then
                move it forward.
              </p>
            </section>
            <section className="card">
              <h2>Give your artwork breathing room</h2>
              <svg
                className="safe-diagram"
                viewBox="0 0 300 240"
                role="img"
                aria-label="Page diagram showing top binding and safe print area"
              >
                <rect
                  x="65"
                  y="10"
                  width="160"
                  height="220"
                  fill="#faf8f0"
                  stroke="#b9bcae"
                />
                <rect x="65" y="10" width="160" height="30" fill="#e3dfd2" />
                <text x="145" y="29" textAnchor="middle" fontSize="9">
                  TOP BINDING · 0.6 in
                </text>
                <rect
                  x="78"
                  y="48"
                  width="134"
                  height="168"
                  fill="none"
                  stroke="#6c8d73"
                  strokeDasharray="4 3"
                />
                <text x="145" y="120" textAnchor="middle" fontSize="11">
                  Safe artwork area
                </text>
                <text x="145" y="137" textAnchor="middle" fontSize="9">
                  0.25 in safe margins
                </text>
                <text x="236" y="130" fontSize="10">
                  7 in
                </text>
                <text x="132" y="239" fontSize="10">
                  5 in
                </text>
              </svg>
              <p className="hint">
                Shown: prototype 5 × 7 inch format. Cover and backing share the
                finished dimensions; confirm any cover overhang and bleed with
                the printer.
              </p>
            </section>
          </div>
          <section className="card guide-steps">
            <h2>Your first notebook, step by step</h2>
            {guideSteps.map((step, i) => (
              <div key={step}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </div>
            ))}
          </section>
          <div className="guide-grid">
            <section className="card">
              <h2>A reusable little safeguard</h2>
              <p>
                Place the reusable protective sheet directly underneath the
                artwork you're coloring. Move the sheet to the next page as you
                progress.
              </p>
              <p>
                Use a smooth removable PP or PET insert, or ask your printer
                about a mechanically suitable bound-in sheet. A printed
                instruction card can accompany blank plastic. Printing directly
                on plastic requires a compatible material and process.
              </p>
              <button
                onClick={() =>
                  action(async () =>
                    download(
                      await protectivePDF(
                        project,
                        notebook.protective === "bound",
                      ),
                      "protective-sheet-template.pdf",
                    ),
                  )
                }
              >
                Download cutting template & instructions
              </button>
            </section>
            <section className="card">
              <h2>Ask a printer for a quote</h2>
              <p>
                Request quantities of 1, 5, 10, 25, 50 and 100. Specify finished
                size, page count, single-sided stock, cover stock, rigid
                backing, insert material, binding, hole pitch, proofing,
                delivery and assembly.
              </p>
              <p>
                Edit dimensions in Create and material assumptions in Notebook
                Builder. The ZIP includes these specifications and a bill of
                materials. RGB exports are not certified CMYK production files.
              </p>
              <button
                onClick={() =>
                  action(async () =>
                    download(
                      await documentPDF("PRINTING SPECIFICATIONS", [
                        `Notebook: ${notebook.title}`,
                        `Quote quantities: 1, 5, 10, 25, 50, 100.`,
                        `Finished size: ${s.width} x ${s.height} inches. ${notebook.pages.length} single-sided pages.`,
                        `Paper: ${notebook.paperGsm} gsm uncoated. Backing: ${notebook.boardMm} mm chipboard.`,
                        `Top spiral / Wire-O. Clearance ${s.binding} in; margin ${s.margin} in; bleed ${s.bleed} in.`,
                        `Protective insert: PP / PET, ${notebook.protective}.`,
                        `Confirm cover stock, hole pitch, binding diameter, material proof, color proof, finishing, shipping and turnaround.`,
                      ]),
                      "printing-specifications.pdf",
                    ),
                  )
                }
              >
                Download current specification sheet
              </button>
            </section>
          </div>
        </main>
      )}
      {(cropOpen || project.cropReview) && (
        <CropEditor
          key={project.id}
          project={project}
          status={analysisStatus}
          onApply={(framing) => {
            setProject((p) => ({
              ...p,
              framing,
              cropReview: false,
              edits: {},
              variants: undefined,
            }));
            setCropOpen(false);
          }}
          onDismiss={() => {
            setProject((p) => ({ ...p, cropReview: false }));
            setCropOpen(false);
          }}
          onRetry={() => setAnalysisRequest((n) => n + 1)}
        />
      )}
      <footer>
        <span>
          <Flower2 size={14} /> A little less scrolling. A little more coloring.
        </span>
        <span>
          Made for real paper & real moments. · No accounts. No uploads.
        </span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI).href)
      .catch(() => {}),
  );
}
