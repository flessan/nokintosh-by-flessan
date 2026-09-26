export function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function CameraMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="0.5" y="3.5" width="15" height="10" fill="#d4d0c8" stroke="#000" />
      <rect x="1.5" y="4.5" width="13" height="8" fill="#0a246a" />
      <circle cx="8" cy="8.5" r="3" fill="#d4d0c8" stroke="#000" />
      <circle cx="8" cy="8.5" r="1.4" fill="#0a246a" />
      <rect x="10.5" y="1.5" width="4" height="2" fill="#fff" stroke="#000" />
    </svg>
  );
}

export function CheckMark({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <path d="M0 5h2v2H0zM2 7h2v2H2zM4 5h2v2H4zM6 3h2v2H6zM8 1h2v2H8z" />
    </svg>
  );
}


export function MirrorIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <path d="M8 1v14" />
      <path d="M2 4l4 4-4 4V4Z" fill="currentColor" stroke="none" />
      <path d="M14 4l-4 4 4 4V4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlipVerticalIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      <path d="M1 8h14" />
      <path d="M4 2l4 4 4-4H4Z" fill="currentColor" stroke="none" />
      <path d="M4 14l4-4 4 4H4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
