import { Button } from "./widgets";

export function StatusBar({
  message,
  detail,
  engine,
  canExport,
  busy,
  onExport,
  onOptions,
}: {
  message: string;
  detail: string;
  engine: string;
  canExport: boolean;
  busy: boolean;
  onExport: () => void;
  onOptions: () => void;
}) {
  return (
    <div className="flex items-center gap-[3px] bg-[color:var(--face)] px-[3px] py-[3px]">
      <p
        className="bevel-thin-in min-w-0 flex-1 truncate px-2 py-[3px] text-[11px]"
        aria-live="polite"
      >
        {message}
      </p>
      <p className="bevel-thin-in hidden shrink-0 px-2 py-[3px] font-mono text-[11px] sm:block">
        {detail}
      </p>
      <p className="bevel-thin-in hidden shrink-0 px-2 py-[3px] font-mono text-[11px] lg:block">
        {engine}
      </p>
      <Button
        className="min-w-[52px] px-2"
        onClick={onOptions}
        disabled={!canExport || busy}
        aria-label="Export options"
        title="Export options"
      >
        Options
      </Button>
      <Button
        variant="default"
        className="min-w-[104px]"
        onClick={onExport}
        disabled={!canExport || busy}
      >
        {busy ? "Encoding..." : "Export AVIF"}
      </Button>
    </div>
  );
}
