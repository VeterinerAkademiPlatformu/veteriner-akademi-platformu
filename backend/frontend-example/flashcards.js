import { apiRequest } from "./api.js";

// rating: 1 = unuttum/zorlandım, 3 = hatırladım ama zorlandım, 5 = kolay.
export async function submitFlashcardReview(flashcardId, rating) {
  return apiRequest("/api/flashcards/review", {
    method: "PUT",
    body: JSON.stringify({ flashcard_id: flashcardId, rating }),
  });
}
