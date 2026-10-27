// Use this helper from a frontend served by the same Flask origin.
 // If the UI remains on GitHub Pages, configure API_BASE to the deployed API
 // origin and allow only that exact origin in Flask CORS settings.
const API_BASE = window.STUDY_API_BASE || "";

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `İstek başarısız (HTTP ${response.status}).`);
  }
  return payload;
}
