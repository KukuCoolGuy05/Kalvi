"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AddContentModal — lets the learner bring their own material (lecture slides
 * or a PDF) into a session. They pick or drag-drop a file; we start a learning
 * session titled after that file so the tutor can work through it with them.
 *
 * Note: this prototype keeps the file client-side and uses its name as the
 * session topic — it does not yet upload/parse the document. The UI is the
 * seam where real ingestion (text extraction, chunking) would plug in.
 *
 * Accessibility:
 *  - role="dialog" + aria-modal, labelled by the title.
 *  - Escape closes; clicking the backdrop closes.
 *  - The drop zone is also a real <button> so it's keyboard-reachable.
 */
const ACCEPTED = ".pdf,.ppt,.pptx,.key,.odp";

export function AddContentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when closed.
  useEffect(() => {
    if (!open) {
      setFile(null);
      setDragging(false);
      setBusy(false);
    }
  }, [open]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function start() {
    if (!file) return;
    setBusy(true);
    // Strip the extension for a friendlier session title.
    const topic = file.name.replace(/\.[^.]+$/, "");
    router.push(
      `/learn?subject=${encodeURIComponent("My materials")}&topic=${encodeURIComponent(topic)}`
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-content-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg animate-fade-in flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border p-4">
          <div>
            <h2 id="add-content-title" className="text-lg font-bold text-fg">
              Add your own content
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Bring lecture slides or a PDF and learn it with your tutor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-surface-alt hover:text-fg"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
              dragging
                ? "border-primary bg-surface-alt"
                : "border-border bg-bg hover:border-primary hover:bg-surface-alt"
            }`}
          >
            <span className="text-muted">
              <UploadIcon />
            </span>
            {file ? (
              <span className="font-medium text-fg">{file.name}</span>
            ) : (
              <>
                <span className="font-medium text-fg">
                  Drop a file here, or click to browse
                </span>
                <span className="text-xs text-muted">
                  PDF, PowerPoint, Keynote (.pdf, .ppt, .pptx, .key, .odp)
                </span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-fg hover:bg-surface-alt"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || busy}
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Spinner /> : null}
            Start learning
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Inline icons ---

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
    </svg>
  );
}
