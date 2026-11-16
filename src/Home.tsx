import { BookOpen, Plus, ImagePlus } from "lucide-react";
import type { NotebookEntry } from "./types";
export function Home({
  notebooks,
  onNew,
  onEdit,
  onPage,
}: {
  notebooks: NotebookEntry[];
  onNew: () => void;
  onEdit: (entry: NotebookEntry) => void;
  onPage: () => void;
}) {
  return (
    <main className="home-page">
      <section className="home-welcome">
        <div>
          <p className="eyebrow">YOUR LOCAL COLORING LIBRARY</p>
          <h1>A little space for your next idea.</h1>
          <p>
            Create a notebook, return to a work in progress, or start a new
            page.
          </p>
        </div>
        <div className="button-row">
          <button className="primary" onClick={onNew}>
            <Plus size={17} />
            Create notebook
          </button>
          <button onClick={onPage}>
            <ImagePlus size={17} />
            New page
          </button>
        </div>
      </section>
      <div className="home-section-heading">
        <h2>Your notebooks</h2>
        <span>Saved automatically on this device</span>
      </div>
      <div className="notebook-gallery">
        {notebooks.map((entry) => (
          <article className="notebook-card" key={entry.id}>
            <button
              className="notebook-cover"
              aria-label={`Edit notebook ${entry.notebook.title}`}
              onClick={() => onEdit(entry)}
            >
              {entry.notebook.pages[0] ? (
                <img
                  src={entry.notebook.pages[0].image}
                  alt="First page photograph"
                />
              ) : (
                <BookOpen size={52} />
              )}
              <span>
                {entry.notebook.pages.length}{" "}
                {entry.notebook.pages.length === 1 ? "page" : "pages"}
              </span>
            </button>
            <h3>{entry.notebook.title || "Untitled notebook"}</h3>
            <p>Edited {new Date(entry.updated).toLocaleDateString()}</p>
            <button onClick={() => onEdit(entry)}>Edit notebook</button>
          </article>
        ))}
      </div>
      <details className="install-help">
        <summary>Add to iPhone Home Screen</summary>
        <p>
          Open this site in Safari, tap Share, choose Add to Home Screen, leave
          Open as Web App enabled if shown, then tap Add. Open the new icon to
          use the standalone app.
        </p>
      </details>
      <p className="home-privacy">
        Photos and notebooks stay in this browser. Export backups to move them
        between devices or installations.
      </p>
    </main>
  );
}
