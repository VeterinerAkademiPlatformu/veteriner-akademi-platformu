from datetime import date, timedelta


def calculate_next_review(card, rating, today=None):
    """Update a card using an SM-2-inspired deterministic schedule.

    rating: 1 = difficult/forgotten, 3 = recalled with effort, 5 = easy.
    Returns the next review date. No AI or external API is involved.
    """
    if rating not in (1, 3, 5):
        raise ValueError("rating 1, 3 veya 5 olmalıdır.")

    today = today or date.today()
    ease = card.ease_factor or 2.5
    repetitions = card.repetitions or 0
    interval = card.interval_days or 0

    if rating == 1:
        repetitions = 0
        interval = 1
        ease = max(1.3, ease - 0.2)
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 3
        else:
            interval = max(1, round(max(1, interval) * ease))
        repetitions += 1
        if rating == 3:
            ease = max(1.3, ease - 0.05)
        else:
            ease = min(3.0, ease + 0.1)

    card.ease_factor = round(ease, 2)
    card.repetitions = repetitions
    card.interval_days = interval
    card.next_review_date = today + timedelta(days=interval)
    return card.next_review_date
