import { BookOpen, Plus, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { NotebookEntry } from "./types";
export function Home({
  notebooks,
  ready,
  onNew,
  onEdit,
  onDelete,
  onPage,
}: {
  notebooks: NotebookEntry[];
  ready: boolean;
  onNew: () => void;
  onEdit: (entry: NotebookEntry) => void;
  onDelete: (entry: NotebookEntry) => Promise<boolean>;
  onPage: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  async function confirmDeletion(entry: NotebookEntry, title: string) {
    if (
      !confirm(
        `Delete “${title}” and all pages in it from this device? Separately saved projects will remain.`,
      )
    )
      return;
    setDeleting(true);
    if (await onDelete(entry)) heading.current?.focus();
    setDeleting(false);
  }

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
          <button
            className="primary"
            disabled={!ready || deleting}
            onClick={onNew}
          >
            <Plus size={17} />
            Create notebook
          </button>
          <button disabled={deleting} onClick={onPage}>
            <ImagePlus size={17} />
            New page
          </button>
        </div>
      </section>
      <div className="home-section-heading">
        <h2 ref={heading} tabIndex={-1}>
          Your notebooks
        </h2>
        <span>Saved automatically on this device</span>
      </div>
      {ready && !notebooks.length && <p>No notebooks yet.</p>}
      <div className="notebook-gallery">
        {notebooks.map((entry) => {
          const title = entry.notebook.title || "Untitled notebook";
          return (
            <article className="notebook-card" key={entry.id}>
              <button
                className="notebook-cover"
                aria-label={`Edit notebook ${title}`}
                disabled={deleting}
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
              <h3>{title}</h3>
              <p>Edited {new Date(entry.updated).toLocaleDateString()}</p>
              <div className="notebook-card-actions">
                <button disabled={deleting} onClick={() => onEdit(entry)}>
                  Edit notebook
                </button>
                <button
                  className="delete-notebook"
                  aria-label={`Delete notebook ${title}`}
                  disabled={deleting}
                  onClick={() => confirmDeletion(entry, title)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Delete
                </button>
              </div>
            </article>
          );
        })}
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
