import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk/CSS preload errors after a new deploy
const RELOAD_KEY = "__vouti_chunk_reload__";
const STALE_ASSET_RE = /Unable to preload (CSS|module)|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk|\/assets\/.*\.(css|js)/i;

const recoverFromStaleAsset = async (msg: string) => {
  if (!STALE_ASSET_RE.test(msg)) return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");

  // A stale PWA/cache can keep an old index pointing to assets removed by a new deploy.
  // Clear only on this failure path, then force a fresh navigation.
  if ("caches" in window) {
    await caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => undefined);
  }

  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister().catch(() => undefined))))
      .catch(() => undefined);
  }

  // Cache-bust the navigation so the browser fetches a fresh index.html
  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString());
  window.location.replace(url.toString());
};
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const payload = event.payload;
  void recoverFromStaleAsset(String(payload?.message || payload || ""));
});
window.addEventListener("error", (e) => {
  const target = e.target as HTMLElement | null;
  const assetUrl = target instanceof HTMLLinkElement ? target.href : target instanceof HTMLScriptElement ? target.src : "";
  void recoverFromStaleAsset(e?.message || assetUrl || "");
}, true);
window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => void recoverFromStaleAsset(String(e?.reason?.message || e?.reason || "")));
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 3000);
  setTimeout(() => sessionStorage.removeItem("__vouti_bad_lazy_reload__"), 3000);
});

createRoot(document.getElementById("root")!).render(
  <App />
);

