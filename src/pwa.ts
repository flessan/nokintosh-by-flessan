/**
 * Progressive web app wiring.
 *
 * The editor is a static, local-first application, so the whole shell can be
 * cached. Everything here fails silently: the PWA layer is never a visible
 * product feature.
 */

const MANIFEST = {
  name: "Nokintosh Digicam Utility",
  short_name: "Nokintosh",
  description: "Give modern photos the character of an old digital camera.",
  start_url: ".",
  scope: ".",
  display: "standalone",
  orientation: "any",
  background_color: "#3a6ea5",
  theme_color: "#0a246a",
  icons: [
    {
      src:
        "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0a246a"/><rect x="6" y="16" width="52" height="34" fill="#d4d0c8" stroke="#000" stroke-width="2"/><circle cx="32" cy="33" r="11" fill="#0a246a" stroke="#000" stroke-width="2"/><circle cx="32" cy="33" r="4" fill="#d4d0c8"/><rect x="40" y="9" width="12" height="6" fill="#fff" stroke="#000" stroke-width="2"/></svg>`,
        ),
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
  ],
};

export function installPwa() {
  try {
    const blob = new Blob([JSON.stringify(MANIFEST)], { type: "application/manifest+json" });
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = URL.createObjectURL(blob);
    document.head.appendChild(link);
  } catch {
    /* manifest is optional */
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline support unavailable - the app still works */
      });
    });
  }
}
