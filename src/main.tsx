import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk/CSS preload errors after a new deploy
const RELOAD_KEY = "__vouti_chunk_reload__";
const handlePreloadError = (msg: string) => {
  if (!/Unable to preload|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg)) return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, "1");
  window.location.reload();
};
window.addEventListener("error", (e) => handlePreloadError(e?.message || ""));
window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => handlePreloadError(String(e?.reason?.message || e?.reason || "")));
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 3000);
});

createRoot(document.getElementById("root")!).render(
  <App />
);

