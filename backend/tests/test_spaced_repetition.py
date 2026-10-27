from datetime import date
from types import SimpleNamespace

import pytest

from app.services.spaced_repetition import calculate_next_review


def card():
    return SimpleNamespace(ease_factor=2.5, interval_days=0, repetitions=0, next_review_date=None)


def test_first_review_schedules_next_day():
    item = card()
    assert calculate_next_review(item, 5, date(2026, 10, 27)) == date(2026, 10, 28)
    assert item.repetitions == 1
    assert item.interval_days == 1


def test_second_successful_review_schedules_three_days():
    item = card()
    calculate_next_review(item, 5, date(2026, 10, 27))
    assert calculate_next_review(item, 5, date(2026, 10, 28)) == date(2026, 10, 31)
    assert item.repetitions == 2


def test_difficult_answer_resets_repetition():
    item = card()
    calculate_next_review(item, 5, date(2026, 10, 27))
    calculate_next_review(item, 5, date(2026, 10, 28))
    assert calculate_next_review(item, 1, date(2026, 10, 29)) == date(2026, 10, 30)
    assert item.repetitions == 0
    assert item.interval_days == 1


def test_invalid_rating_is_rejected():
    with pytest.raises(ValueError):
        calculate_next_review(card(), 4, date(2026, 10, 27))
