// Use this helper from a frontend served by the same Flask origin.
// If the UI remains on GitHub Pages, deploy the API separately and configure
// credentialed CORS, SameSite=None; Secure cookies, and an exact origin allowlist.
const API_BASE = window.STUDY_API_BASE || "";
let csrfToken = null;

async function getCsrfToken() {
  const response = await fetch(API_BASE + "/api/auth/csrf", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.csrf_token) {
    throw new Error(payload?.error || "Güvenlik anahtarı alınamadı.");
  }
  csrfToken = payload.csrf_token;
  return csrfToken;
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    headers.set("X-CSRFToken", await getCsrfToken());
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `İstek başarısız (HTTP ${response.status}).`);
  }
  return payload;
}
