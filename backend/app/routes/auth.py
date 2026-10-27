from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from flask_wtf.csrf import generate_csrf
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db, limiter
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("auth_api", __name__)


@bp.get("/auth/csrf")
def csrf_token():
    """Return a session-bound CSRF token for browser clients."""
    return jsonify(csrf_token=generate_csrf())


@bp.post("/auth/register")
@limiter.limit("5 per minute")
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not email or "@" not in email or len(email) > 254:
        return jsonify(error="Geçerli bir e-posta girin."), 400
    if len(password) < 10:
        return jsonify(error="Şifre en az 10 karakter olmalıdır."), 400
    if db.session.scalar(select(User).where(User.email == email)):
        return jsonify(error="Bu e-posta zaten kayıtlı."), 409

    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return jsonify(id=user.id, email=user.email), 201


@bp.post("/auth/login")
@limiter.limit("5 per minute")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    user = db.session.scalar(select(User).where(User.email == email))
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify(error="E-posta veya şifre hatalı."), 401
    login_user(user)
    return jsonify(id=user.id, email=user.email)


@bp.post("/auth/logout")
@login_required
def logout():
    logout_user()
    return jsonify(status="ok")


@bp.get("/auth/me")
@login_required
def who_am_i():
    return jsonify(id=current_user.id, email=current_user.email)
