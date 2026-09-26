import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildFilename,
  downloadBlob,
  exportImage,
  FORMAT_LABEL,
  formatBytes,
  type ExportOptions,
} from "./engine/export";
import { PRESETS, PRESET_MAP } from "./engine/presets";
import { useEditor } from "./state/useEditor";
import { usePreview } from "./state/usePreview";
import { EffectsPanel } from "./ui/EffectsPanel";
import { ExportDialog } from "./ui/ExportDialog";
import { CameraMark, GithubIcon } from "./ui/icons";
import { MenuBar, type Menu } from "./ui/MenuBar";
import { PresetList } from "./ui/PresetList";
import { PreviewStage } from "./ui/PreviewStage";
import { StatusBar } from "./ui/StatusBar";
import { Button, GroupBox } from "./ui/widgets";

const REPO_URL = "https://github.com/flessan/nokintosh-by-flessan";

export default function App() {
  const editor = useEditor();
  const [showOriginal, setShowOriginal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [tab, setTab] = useState<"presets" | "effects">("presets");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportOpts, setExportOpts] = useState<ExportOptions>({
    format: "avif",
    quality: 0.82,
    maxSize: 100000,
  });
  const fileInput = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);

  const { photo, params, presetId } = editor;
  const { canvasRef, stageRef, info } = usePreview(photo, params, presetId, showOriginal, !editor.hasUnappliedChanges);

  // ---------- file input ----------
  const pickFile = useCallback(() => fileInput.current?.click(), []);

  // ---------- drag & drop ----------
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragOver(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      void editor.openFile(e.dataTransfer.files[0]);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [editor]);

  // ---------- clipboard paste ----------
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void editor.openFile(file);
          }
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editor]);

  // ---------- export ----------
  const runExport = useCallback(
    async (options: ExportOptions) => {
      if (!photo || exporting) return;
      setExportOpts(options);
      setExporting(true);
      editor.setStatus(`Rendering and encoding ${FORMAT_LABEL[options.format]}...`);
      try {
        const result = await exportImage(
          photo.source,
          photo.width,
          photo.height,
          params,
          options,
        );
        const presetName = PRESET_MAP[presetId]?.name ?? "custom";
        const name = buildFilename(photo.name, presetName, result.format);
        downloadBlob(result.blob, name);
        editor.setStatus(
          `Saved ${name} // ${result.width} x ${result.height}, ${formatBytes(result.blob.size)}` +
          (result.fellBack ? " (AVIF unavailable, used fallback format)" : ""),
        );
        setDialogOpen(false);
      } catch {
        editor.setStatus("Export failed. Try a smaller output size.");
      } finally {
        setExporting(false);
      }
    },
    [editor, exporting, params, photo, presetId],
  );

  const quickExport = useCallback(() => {
    void runExport({ ...exportOpts, format: "avif" });
  }, [exportOpts, runExport]);

  // ---------- keyboard ----------
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(t.tagName) || t.isContentEditable);
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        pickFile();
      } else if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        quickExport();
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        editor.applyChanges();
      } else if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        editor.redo();
      } else if (mod && e.key === "0") {
        e.preventDefault();
        editor.resetAll();
      } else if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault();
        if (!e.repeat) setShowOriginal(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setShowOriginal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [editor, pickFile, quickExport]);

  // ---------- menus ----------
  const menus: Menu[] = useMemo(
    () => [
      {
        label: "File",
        items: [
          { label: "Open Photo...", shortcut: "Ctrl+O", action: pickFile },
          { label: "Open Sample Photo", action: () => void editor.openSample() },
          { label: "Close Photo", action: editor.closePhoto, disabled: !photo, separatorAfter: true },
          {
            label: "Export AVIF",
            shortcut: "Ctrl+E",
            action: quickExport,
            disabled: !photo,
          },
          { label: "Export Options...", action: () => setDialogOpen(true), disabled: !photo },
        ],
      },
      {
        label: "Edit",
        items: [
          { label: "Undo", shortcut: "Ctrl+Z", action: editor.undo, disabled: !editor.canUndo },
          {
            label: "Redo",
            shortcut: "Ctrl+Y",
            action: editor.redo,
            disabled: !editor.canRedo,
            separatorAfter: true,
          },
          {
            label: "Apply Changes",
            shortcut: "Ctrl+Enter",
            action: editor.applyChanges,
            disabled: !editor.hasUnappliedChanges,
            separatorAfter: true,
          },
          { label: "Reset All Effects", shortcut: "Ctrl+0", action: editor.resetAll },
        ],
      },
      {
        label: "View",
        items: [
          {
            label: "Show Original",
            shortcut: "Space",
            checked: showOriginal,
            action: () => setShowOriginal((v) => !v),
            separatorAfter: true,
          },
          { label: "Presets Panel", checked: tab === "presets", action: () => setTab("presets") },
          { label: "Effects Panel", checked: tab === "effects", action: () => setTab("effects") },
        ],
      },
      {
        label: "Presets",
        items: PRESETS.map((p) => ({
          label: p.name,
          checked: p.id === presetId,
          action: () => editor.applyPreset(p.id),
        })),
      },
    ],
    [editor, photo, presetId, pickFile, quickExport, showOriginal, tab],
  );

  const detail = photo
    ? `${photo.width}x${photo.height}`
    : "no image";
  const previewName = PRESET_MAP[presetId]?.name ?? "Custom";
  const previewStatus =
    info.phase === "loading"
      ? "[Loading] " + previewName
      : info.phase === "cached"
        ? "[Cached] " + previewName
        : hint ?? (info.phase === "rendered"
          ? "Preview ready // " + previewName
          : editor.status);
  const engineLabel =
    info.engine === "webgl2"
      ? `GPU  ${info.previewWidth}x${info.previewHeight}  ${info.lastRenderMs.toFixed(1)}ms`
      : info.engine === "canvas2d"
        ? `CPU  ${info.previewWidth}x${info.previewHeight}`
        : "idle";

  const panels = (
    <>
      <GroupBox label="Presets">
        <PresetList presetId={presetId} onPick={editor.applyPreset} onHint={setHint} />
      </GroupBox>
      <GroupBox label="Effects">
        <EffectsPanel
          params={params}
          onChange={editor.setParam}
          onCommitStart={editor.beginAdjust}
          onCommitEnd={editor.endAdjust}
          onHint={setHint}
          onApply={editor.applyChanges}
          canApply={editor.hasUnappliedChanges}
        />
        <div className="mt-2 flex gap-2 px-[5px] pb-1">
          <Button className="flex-1" onClick={editor.resetAll}>
            Reset All
          </Button>
          <Button
            className="flex-1"
            data-pressed={showOriginal}
            aria-pressed={showOriginal}
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            onKeyDown={(e) => e.key === "Enter" && setShowOriginal(true)}
            onKeyUp={() => setShowOriginal(false)}
          >
            Hold: Original
          </Button>
        </div>
      </GroupBox>
    </>
  );

  return (
    <div className="flex h-[100dvh] w-full justify-center bg-[color:var(--desktop)] lg:items-center lg:p-4">
      <div className="bevel-raised flex h-full w-full max-w-[1440px] flex-col p-[3px] lg:h-[min(940px,100%)]">
        {/* ---- title bar ---- */}
        <div className="title-bar shrink-0 overflow-hidden">
          <span className="mr-2 flex items-center">
            <CameraMark />
          </span>
          <h1 className="min-w-0 flex-1 truncate text-[12px] font-bold">
            Nokintosh // Digicam Utility
            {photo ? ` // ${photo.name}` : ""}
          </h1>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Source repository on GitHub"
            title="GitHub"
            className="github-link shrink-0"
          >
            <GithubIcon size={16} />
          </a>
        </div>

        {/* ---- menu bar ---- */}
        <div className="shrink-0 bg-[color:var(--face)]">
          <MenuBar menus={menus} />
          <div className="h-[2px] bevel-thin-in" />
        </div>

        {/* ---- toolbar ---- */}
        <div className="flex shrink-0 flex-wrap items-center gap-[3px] bg-[color:var(--face)] px-[3px] py-[3px]">
          <Button onClick={pickFile}>Open...</Button>
          <Button onClick={() => void editor.openSample()}>Sample</Button>
          <span className="mx-1 h-[20px] w-[2px] bevel-thin-in" />
          <Button onClick={editor.undo} disabled={!editor.canUndo}>
            Undo
          </Button>
          <Button onClick={editor.redo} disabled={!editor.canRedo}>
            Redo
          </Button>
          <Button onClick={editor.resetAll}>Reset</Button>
          <span className="mx-1 hidden h-[20px] w-[2px] bevel-thin-in sm:block" />
          <Button
            className="hidden sm:inline-flex"
            data-pressed={showOriginal}
            aria-pressed={showOriginal}
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
          >
            Hold: Original
          </Button>
          <span className="ml-auto hidden px-2 text-[11px] text-[color:var(--ink-dim)] lg:block">
            {PRESET_MAP[presetId]?.name ?? "Custom settings"}{editor.hasUnappliedChanges ? " *" : ""}
          </span>
        </div>

        {/* ---- workspace ---- */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* preview */}
          <main className="order-1 flex min-h-[32vh] flex-1 flex-col p-[3px] lg:order-2 lg:min-h-0">
            <PreviewStage
              photo={photo}
              canvasRef={canvasRef}
              stageRef={stageRef}
              dragOver={dragOver}
              showOriginal={showOriginal}
              loading={editor.loading}
              onOpen={pickFile}
              onSample={() => void editor.openSample()}
            />
          </main>

          {/* side panel: desktop */}
          <aside className="order-2 hidden w-[244px] shrink-0 flex-col overflow-hidden bg-[color:var(--face)] lg:order-1 lg:flex">
            <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">{panels}</div>
          </aside>

          {/* side panel: mobile / tablet */}
          <section className="order-3 flex shrink-0 flex-col bg-[color:var(--face)] lg:hidden">
            <div className="flex gap-[2px] px-[3px] pt-[3px]">
              {(["presets", "effects"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={
                    "ui-tab ui-btn flex-1 capitalize " +
                    (tab === t ? "font-bold" : "text-[color:var(--ink-dim)]")
                  }
                  data-pressed={tab === t}
                  aria-pressed={tab === t}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="scroll-thin max-h-[40vh] overflow-y-auto">
              {tab === "presets" ? (
                <GroupBox label="Presets">
                  <PresetList presetId={presetId} onPick={editor.applyPreset} onHint={setHint} />
                </GroupBox>
              ) : (
                <GroupBox label="Effects">
                  <EffectsPanel
                    params={params}
                    onChange={editor.setParam}
                    onCommitStart={editor.beginAdjust}
                    onCommitEnd={editor.endAdjust}
                    onHint={setHint}
                    onApply={editor.applyChanges}
                    canApply={editor.hasUnappliedChanges}
                  />
                  <div className="mt-2 flex gap-2 px-[5px] pb-1">
                    <Button className="flex-1" onClick={editor.resetAll}>
                      Reset All
                    </Button>
                    <Button
                      className="flex-1"
                      data-pressed={showOriginal}
                      aria-pressed={showOriginal}
                      onPointerDown={() => setShowOriginal(true)}
                      onPointerUp={() => setShowOriginal(false)}
                      onPointerLeave={() => setShowOriginal(false)}
                    >
                      Hold: Original
                    </Button>
                  </div>
                </GroupBox>
              )}
            </div>
          </section>
        </div>

        {/* ---- status bar ---- */}
        <div className="shrink-0">
          <StatusBar
            message={previewStatus}
            detail={detail}
            engine={engineLabel}
            canExport={!!photo}
            busy={exporting}
            onExport={quickExport}
            onOptions={() => setDialogOpen(true)}
          />
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void editor.openFile(f);
          e.target.value = "";
        }}
      />

      <ExportDialog
        open={dialogOpen}
        busy={exporting}
        sourceWidth={photo?.width ?? 0}
        sourceHeight={photo?.height ?? 0}
        initial={exportOpts}
        onClose={() => setDialogOpen(false)}
        onExport={(o) => void runExport(o)}
      />
    </div>
  );
}
