import { apiRequest } from "./api.js";

export async function saveCompletedPomodoro({ topicId, durationMinutes = 25, startedAt, endedAt }) {
  if (!Number.isInteger(topicId) || topicId < 1) {
    throw new Error("Önce geçerli bir konu seçin.");
  }

  return apiRequest("/api/pomodoro/save", {
    method: "POST",
    body: JSON.stringify({
      topic_id: topicId,
      duration_minutes: durationMinutes,
      started_at: startedAt,
      ended_at: endedAt,
    }),
  });
}
