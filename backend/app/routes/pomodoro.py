from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("pomodoro_api", __name__)

@bp.post("/pomodoro/save")
@login_required
def save_pomodoro():
    data = request.get_json(silent=True) or {}
    try:
        topic_id = int(data.get("topic_id"))
        duration = int(data.get("duration_minutes", 25))
        started = datetime.fromisoformat(str(data.get("started_at")).replace("Z", "+00:00"))
        ended = datetime.fromisoformat(str(data.get("ended_at")).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return jsonify(error="topic_id, duration_minutes, started_at ve ended_at alanlarını kontrol edin."), 400
    if not 1 <= duration <= 180 or ended <= started:
        return jsonify(error="Çalışma süresi veya zaman aralığı geçersiz."), 400
    topic = owned_topic(topic_id, current_user.id)
    if not topic:
        return jsonify(error="Konu bulunamadı."), 404

    session = StudySession(
        user_id=current_user.id, topic_id=topic.id, session_type="pomodoro",
        duration_minutes=duration, started_at=started, ended_at=ended,
    )
    db.session.add(session)
    today = date.today()
    entry = db.session.scalar(select(CalendarEntry).where(
        CalendarEntry.user_id == current_user.id,
        CalendarEntry.topic_id == topic.id,
        CalendarEntry.study_date == today,
        CalendarEntry.status.in_(["planned", "completed"]),
    ).order_by(CalendarEntry.id.desc()))
    if entry:
        entry.completed_minutes += duration
        if entry.completed_minutes >= entry.planned_minutes:
            entry.status = "completed"
        progress = min(100, round(entry.completed_minutes / max(1, entry.planned_minutes) * 100))
    else:
        progress = None
    db.session.commit()
    return jsonify(
        message=f"{topic.title} konusu için {duration} dakika çalışıldı.",
        session_id=session.id,
        calendar_progress=progress,
    ), 201
