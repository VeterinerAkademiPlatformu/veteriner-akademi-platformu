/* Optional Flask API bridge.
 * Set window.VETERINER_AKADEMI_API_URL to the deployed API origin before this file loads.
 * This bridge is deliberately opt-in: the current Supabase workspace remains unchanged
 * until the Flask API is deployed and explicitly enabled.
 */
(function (global) {
  "use strict";

  let csrfToken = null;
  const baseUrl = () => String(global.VETERINER_AKADEMI_API_URL || "").trim().replace(/\/+$/, "");
  const isConfigured = () => Boolean(baseUrl());

  async function readPayload(response) {
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  }

  async function request(path, options = {}) {
    if (!isConfigured()) {
      throw new Error("Flask API henüz yapılandırılmadı. API adresini ayarladıktan sonra tekrar deneyin.");
    }
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined && options.body !== null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const tokenResponse = await fetch(baseUrl() + "/api/auth/csrf", {
        credentials: "include",
        headers: { Accept: "application/json" }
      });
      const tokenPayload = await readPayload(tokenResponse);
      if (!tokenResponse.ok || !tokenPayload || !tokenPayload.csrf_token) {
        throw new Error((tokenPayload && tokenPayload.error) || "Güvenlik anahtarı alınamadı.");
      }
      csrfToken = tokenPayload.csrf_token;
      headers.set("X-CSRFToken", csrfToken);
    }

    const response = await fetch(baseUrl() + path, {
      ...options,
      method,
      headers,
      credentials: "include"
    });
    const payload = await readPayload(response);
    if (!response.ok) {
      throw new Error((payload && payload.error) || ("API isteği başarısız (HTTP " + response.status + ")."));
    }
    return payload;
  }

  const api = {
    get configured() { return isConfigured(); },
    request,
    health: () => request("/api/health"),
    auth: {
      me: () => request("/api/auth/me"),
      register: (email, password) => request("/api/auth/register", {
        method: "POST", body: JSON.stringify({ email, password })
      }),
      login: (email, password) => request("/api/auth/login", {
        method: "POST", body: JSON.stringify({ email, password })
      }),
      logout: () => request("/api/auth/logout", { method: "POST" })
    },
    notes: {
      list: () => request("/api/notes"),
      create: (note) => request("/api/notes", { method: "POST", body: JSON.stringify(note) }),
      update: (id, note) => request("/api/notes/" + encodeURIComponent(id), {
        method: "PUT", body: JSON.stringify(note)
      }),
      remove: (id) => request("/api/notes/" + encodeURIComponent(id), { method: "DELETE" })
    },
    flashcards: {
      review: (flashcardId, rating) => request("/api/flashcards/review", {
        method: "PUT", body: JSON.stringify({ flashcard_id: flashcardId, rating })
      })
    },
    schedule: {
      generate: (subjectId, examDate, topicIds) => request("/api/schedule/generate", {
        method: "POST",
        body: JSON.stringify({ subject_id: subjectId, exam_date: examDate, topic_ids: topicIds })
      }),
      reschedule: (examDate) => request("/api/schedule/reschedule", {
        method: "POST", body: JSON.stringify({ exam_date: examDate })
      })
    }
  };

  global.VeterinerAkademiStudyApi = api;
})(window);
