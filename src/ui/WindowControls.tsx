export function WindowControls({
  maximized,
  onMinimize,
  onMaximize,
  onClose,
}: {
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}) {
  return (
    <div className="window-controls" aria-label="Window controls">
      <button
        type="button"
        className="window-control"
        onClick={onMinimize}
        aria-label="Minimize Nokintosh"
        title="Minimize"
      >
        <span aria-hidden="true" className="translate-y-[3px]">_</span>
      </button>
      <button
        type="button"
        className="window-control"
        onClick={onMaximize}
        aria-label={maximized ? "Restore Nokintosh" : "Maximize Nokintosh"}
        title={maximized ? "Restore" : "Maximize"}
      >
        <span aria-hidden="true">{maximized ? "❐" : "□"}</span>
      </button>
      <button
        type="button"
        className="window-control window-control-close"
        onClick={onClose}
        aria-label="Close Nokintosh window"
        title="Close"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
