import "./lib/mockInterceptor";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global API URL interceptor for static Vercel hosting
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (typeof input === "string" && input.startsWith("/api")) {
    return originalFetch(`${apiUrl}${input}`, init);
  }
  if (input && typeof input === "object" && "url" in input && typeof input.url === "string" && input.url.startsWith("/api")) {
    const newRequest = new Request(`${apiUrl}${input.url}`, input as RequestInit);
    return originalFetch(newRequest, init);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);

