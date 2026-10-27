from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("calendar_api", __name__)

@bp.get("/calendar")
@login_required
def get_calendar():
    start = request.args.get("start", date.today().isoformat())
    end = request.args.get("end", (date.today() + timedelta(days=30)).isoformat())
    try:
        start_date, end_date = date.fromisoformat(start), date.fromisoformat(end)
    except ValueError:
        return jsonify(error="Tarihler YYYY-MM-DD biçiminde olmalıdır."), 400
    if end_date < start_date or (end_date - start_date).days > 366:
        return jsonify(error="Takvim aralığı geçersiz (en fazla 366 gün)."), 400
    rows = db.session.execute(
        select(CalendarEntry, Topic.title).join(Topic).where(
            CalendarEntry.user_id == current_user.id,
            CalendarEntry.study_date.between(start_date, end_date),
        ).order_by(CalendarEntry.study_date, CalendarEntry.order_index)
    ).all()
    return jsonify(entries=[{
        "id": row.CalendarEntry.id,
        "topic_id": row.CalendarEntry.topic_id,
        "topic_title": row.title,
        "date": row.CalendarEntry.study_date.isoformat(),
        "status": row.CalendarEntry.status,
        "planned_minutes": row.CalendarEntry.planned_minutes,
        "completed_minutes": row.CalendarEntry.completed_minutes,
        "progress": min(100, round(row.CalendarEntry.completed_minutes / max(1, row.CalendarEntry.planned_minutes) * 100)),
    } for row in rows])
