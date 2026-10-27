from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("notes_api", __name__)

@bp.get("/notes")
@login_required
def list_notes():
    rows = db.session.scalars(select(Note).where(
        Note.user_id == current_user.id
    ).order_by(Note.updated_at.desc())).all()
    return jsonify(notes=[{
        "id": note.id, "topic_id": note.topic_id, "title": note.title,
        "content": note.content, "updated_at": note.updated_at.isoformat()
    } for note in rows])

@bp.post("/notes")
@login_required
def create_note():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    body = data.get("content", "")
    topic_id = data.get("topic_id")
    if not title or len(title) > 240 or not isinstance(body, str):
        return jsonify(error="Başlık (1-240 karakter) ve metin içerik gereklidir."), 400
    if len(body) > 200000:
        return jsonify(error="Not içeriği çok uzun (en fazla 200.000 karakter)."), 400
    if topic_id is not None:
        try:
            topic_id = int(topic_id)
        except (TypeError, ValueError):
            return jsonify(error="topic_id geçersiz."), 400
        if not owned_topic(topic_id, current_user.id):
            return jsonify(error="Konu bulunamadı."), 404
    note = Note(user_id=current_user.id, topic_id=topic_id, title=title, content=body)
    db.session.add(note)
    db.session.commit()
    return jsonify(id=note.id, title=note.title, topic_id=note.topic_id), 201

@bp.put("/notes/<int:note_id>")
@login_required
def update_note(note_id):
    note = db.session.scalar(select(Note).where(
        Note.id == note_id, Note.user_id == current_user.id
    ))
    if not note:
        return jsonify(error="Not bulunamadı."), 404
    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = str(data["title"]).strip()
        if not title or len(title) > 240:
            return jsonify(error="Başlık 1-240 karakter olmalıdır."), 400
        note.title = title
    if "content" in data:
        if not isinstance(data["content"], str) or len(data["content"]) > 200000:
            return jsonify(error="Not içeriği geçersiz veya çok uzun."), 400
        note.content = data["content"]
    if "topic_id" in data:
        topic_id = data["topic_id"]
        if topic_id is not None:
            try:
                topic_id = int(topic_id)
            except (TypeError, ValueError):
                return jsonify(error="topic_id geçersiz."), 400
            if not owned_topic(topic_id, current_user.id):
                return jsonify(error="Konu bulunamadı."), 404
        note.topic_id = topic_id
    db.session.commit()
    return jsonify(id=note.id, status="saved", updated_at=note.updated_at.isoformat())

@bp.delete("/notes/<int:note_id>")
@login_required
def delete_note(note_id):
    note = db.session.scalar(select(Note).where(
        Note.id == note_id, Note.user_id == current_user.id
    ))
    if not note:
        return jsonify(error="Not bulunamadı."), 404
    db.session.delete(note)
    db.session.commit()
    return jsonify(status="deleted")
