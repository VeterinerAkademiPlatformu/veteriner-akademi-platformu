import { apiRequest } from "./api.js";

export async function loadCalendar(start, end) {
  const query = new URLSearchParams({ start, end });
  const result = await apiRequest(`/api/calendar?${query.toString()}`);
  return result.entries;
}

export async function generateSchedule({ subjectId, examDate, topicIds }) {
  return apiRequest("/api/schedule/generate", {
    method: "POST",
    body: JSON.stringify({
      subject_id: subjectId,
      exam_date: examDate,
      topic_ids: topicIds,
    }),
  });
}

export async function rescheduleMissedWork(examDate) {
  return apiRequest("/api/schedule/reschedule", {
    method: "POST",
    body: JSON.stringify({ exam_date: examDate }),
  });
}
