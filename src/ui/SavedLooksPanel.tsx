import { useState, type FormEvent } from "react";
import type { SavedLook } from "../state/useSavedLooks";

export function SavedLooksPanel({
  looks,
  canSave,
  onSave,
  onApply,
  onDelete,
}: {
  looks: SavedLook[];
  canSave: boolean;
  onSave: (name: string) => void;
  onApply: (look: SavedLook) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !canSave) return;
    onSave(trimmed);
    setName("");
  };

  return (
    <section className="border-b border-[color:var(--shadow)] px-2 pb-2 pt-2">
      <div className="mb-1 flex items-center justify-between gap-2 px-[2px]">
        <h2 className="text-[11px] font-bold uppercase tracking-wide">My Camera Looks</h2>
        <span className="text-[10px] text-[color:var(--ink-dim)]">{looks.length}/24</span>
      </div>

      <form className="flex gap-[3px]" onSubmit={submit}>
        <label className="sr-only" htmlFor="saved-look-name">Name this look</label>
        <input
          id="saved-look-name"
          className="bevel-sunken min-w-0 flex-1 bg-white px-2 py-1 text-[11px]"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={32}
          placeholder="Name this look..."
          disabled={!canSave}
        />
        <button
          type="submit"
          className="ui-btn min-h-[25px] px-2 text-[11px] font-bold"
          disabled={!canSave || !name.trim()}
          title={!canSave ? "Open a photo and keep fewer than 24 saved looks" : "Save current settings"}
        >
          Save
        </button>
      </form>

      <p className="mt-1 px-[2px] text-[10px] text-[color:var(--ink-dim)]">
        Stored only in this browser.
      </p>

      <div className="mt-1 space-y-[2px]" role="list" aria-label="Saved camera looks">
        {looks.length === 0 ? (
          <p className="bevel-thin-in bg-[color:var(--face)] px-2 py-2 text-[11px] text-[color:var(--ink-dim)]">
            No saved looks yet. Create one from your current settings.
          </p>
        ) : (
          looks.map((look) => (
            <div key={look.id} className="flex items-stretch gap-[2px]" role="listitem">
              <button
                type="button"
                className="ui-item min-w-0 flex-1 text-left"
                onClick={() => onApply(look)}
                title={"Load " + look.name}
              >
                <span className="block truncate font-bold">{look.name}</span>
                <span className="block truncate text-[10px] opacity-70">
                  {look.specialEffect.kind === "none" ? "Camera settings" : look.specialEffect.kind === "gaussian-blur" ? "Gaussian Blur" : "Pixelate"}
                  {" · "}
                  {look.frame === "collage" ? "Collage frame" : "No frame"}
                </span>
              </button>
              <button
                type="button"
                className="ui-btn min-h-[27px] w-[27px] shrink-0 px-0 text-[15px]"
                onClick={() => onDelete(look.id)}
                aria-label={"Delete " + look.name}
                title="Delete saved look"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
