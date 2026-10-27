from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("schedule_api", __name__)

@bp.post("/schedule/generate")
@login_required
def generate_schedule():
    data = request.get_json(silent=True) or {}
    try:
        subject_id = int(data.get("subject_id"))
        exam_date = date.fromisoformat(str(data.get("exam_date")))
        requested_ids = data.get("topic_ids", [])
        if not isinstance(requested_ids, list):
            raise ValueError
        topic_ids = list(dict.fromkeys(int(value) for value in requested_ids))
    except (TypeError, ValueError):
        return jsonify(error="subject_id, exam_date ve topic_ids alanlarını kontrol edin."), 400

    from app.services.scheduler import generate_schedule as build_schedule
    try:
        entries = build_schedule(current_user.id, subject_id, exam_date, topic_ids)
    except LookupError as error:
        return jsonify(error=str(error)), 404
    except ValueError as error:
        return jsonify(error=str(error)), 400
    db.session.commit()
    return jsonify(created=len(entries), exam_date=exam_date.isoformat(), entries=entries), 201

@bp.post("/schedule/reschedule")
@login_required
def reschedule_schedule():
    data = request.get_json(silent=True) or {}
    try:
        exam_date = date.fromisoformat(str(data.get("exam_date")))
    except (TypeError, ValueError):
        return jsonify(error="exam_date YYYY-MM-DD biçiminde olmalıdır."), 400
    from app.services.scheduler import reschedule_unfinished
    try:
        entries = reschedule_unfinished(current_user.id, exam_date)
    except ValueError as error:
        return jsonify(error=str(error)), 400
    db.session.commit()
    return jsonify(moved=len(entries), entries=entries), 200
