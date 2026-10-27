from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("flashcards_api", __name__)

@bp.put("/flashcards/review")
@login_required
def review_flashcard():
    data = request.get_json(silent=True) or {}
    try:
        card_id = int(data.get("flashcard_id"))
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify(error="flashcard_id ve rating sayısal olmalıdır."), 400

    card = owned_card(card_id, current_user.id)
    if not card:
        return jsonify(error="Kart bulunamadı."), 404
    try:
        next_date = calculate_next_review(card, rating)
    except ValueError as error:
        return jsonify(error=str(error)), 400

    card.last_reviewed_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(
        flashcard_id=card.id,
        repetitions=card.repetitions,
        interval_days=card.interval_days,
        ease_factor=card.ease_factor,
        next_review_date=next_date.isoformat(),
    )
