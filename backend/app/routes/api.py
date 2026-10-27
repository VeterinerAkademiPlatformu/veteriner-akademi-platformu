from datetime import date, datetime, time, timedelta, timezone
from functools import wraps

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.services.spaced_repetition import calculate_next_review

api_bp = Blueprint("api", __name__)


def owned_topic(topic_id, user_id):
    return db.session.scalar(
        select(Topic).join(Subject).where(
            Topic.id == topic_id, Subject.user_id == user_id
        )
    )


def owned_card(card_id, user_id):
    return db.session.scalar(
        select(Flashcard).join(Topic).join(Subject).where(
            Flashcard.id == card_id, Subject.user_id == user_id
        )
    )


@api_bp.post("/auth/register")
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


@api_bp.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    user = db.session.scalar(select(User).where(User.email == email))
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify(error="E-posta veya şifre hatalı."), 401
    login_user(user)
    return jsonify(id=user.id, email=user.email)


@api_bp.post("/auth/logout")
@login_required
def logout():
    logout_user()
    return jsonify(status="ok")


@api_bp.get("/auth/me")
@login_required
def who_am_i():
    return jsonify(id=current_user.id, email=current_user.email)


@api_bp.put("/flashcards/review")
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


@api_bp.post("/schedule/generate")
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

    subject = db.session.scalar(select(Subject).where(
        Subject.id == subject_id, Subject.user_id == current_user.id
    ))
    if not subject:
        return jsonify(error="Ders bulunamadı."), 404
    today = date.today()
    if exam_date <= today:
        return jsonify(error="Sınav tarihi bugünden sonra olmalıdır."), 400

    topics = db.session.scalars(select(Topic).where(
        Topic.subject_id == subject.id, Topic.id.in_(topic_ids), Topic.completed.is_(False)
    ).order_by(Topic.sort_order, Topic.id)).all() if topic_ids else []
    if len(topics) != len(topic_ids):
        return jsonify(error="Konu listesindeki bazı kayıtlar bulunamadı veya tamamlandı."), 400

    # Keep completed history. Replace only future planned entries for these topics.
    for topic in topics:
        db.session.query(CalendarEntry).filter(
            CalendarEntry.user_id == current_user.id,
            CalendarEntry.topic_id == topic.id,
            CalendarEntry.status == "planned",
            CalendarEntry.study_date >= today,
        ).delete(synchronize_session=False)

    days = (exam_date - today).days  # exam day reserved for light review
    for index, topic in enumerate(topics):
        study_day = today + timedelta(days=index % days)
        db.session.add(CalendarEntry(
            user_id=current_user.id,
            topic_id=topic.id,
            study_date=study_day,
            status="planned",
            planned_minutes=max(10, topic.estimated_minutes or 25),
            order_index=index,
        ))
    db.session.commit()
    return jsonify(
        created=len(topics),
        exam_date=exam_date.isoformat(),
        entries=[{"topic_id": topic.id, "date": (today + timedelta(days=i % days)).isoformat()}
                 for i, topic in enumerate(topics)],
    ), 201


@api_bp.post("/pomodoro/save")
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


@api_bp.get("/calendar")
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


@api_bp.post("/mindmaps")
@login_required
def create_mindmap():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    graph = data.get("data")
    topic_id = data.get("topic_id")
    if not title or not isinstance(graph, dict):
        return jsonify(error="title ve JSON nesnesi olan data zorunludur."), 400
    if topic_id is not None:
        try:
            topic_id = int(topic_id)
        except (TypeError, ValueError):
            return jsonify(error="topic_id geçersiz."), 400
        if not owned_topic(topic_id, current_user.id):
            return jsonify(error="Konu bulunamadı."), 404
    nodes, edges = graph.get("nodes", []), graph.get("edges", [])
    if not isinstance(nodes, list) or not isinstance(edges, list):
        return jsonify(error="nodes ve edges listeler olmalıdır."), 400
    node_ids = {str(node.get("id")) for node in nodes if isinstance(node, dict) and node.get("id") is not None}
    if len(node_ids) != len(nodes):
        return jsonify(error="Her düğüm benzersiz bir id taşımalıdır."), 400
    for edge in edges:
        if not isinstance(edge, dict) or str(edge.get("source")) not in node_ids or str(edge.get("target")) not in node_ids:
            return jsonify(error="Bağlantılar geçerli düğüm id'lerine işaret etmelidir."), 400
    mindmap = MindMap(user_id=current_user.id, topic_id=topic_id, title=title, data=graph)
    db.session.add(mindmap)
    db.session.commit()
    return jsonify(id=mindmap.id, title=mindmap.title), 201


@api_bp.put("/mindmaps/<int:mindmap_id>")
@login_required
def update_mindmap(mindmap_id):
    mindmap = db.session.scalar(select(MindMap).where(
        MindMap.id == mindmap_id, MindMap.user_id == current_user.id
    ))
    if not mindmap:
        return jsonify(error="Zihin haritası bulunamadı."), 404
    data = request.get_json(silent=True) or {}
    graph = data.get("data")
    if not isinstance(graph, dict) or not isinstance(graph.get("nodes", []), list) or not isinstance(graph.get("edges", []), list):
        return jsonify(error="data, nodes ve edges alanlarını içeren JSON nesnesi olmalıdır."), 400
    node_ids = {str(n.get("id")) for n in graph["nodes"] if isinstance(n, dict) and n.get("id") is not None}
    if len(node_ids) != len(graph["nodes"]):
        return jsonify(error="Her düğüm benzersiz bir id taşımalıdır."), 400
    if any(not isinstance(e, dict) or str(e.get("source")) not in node_ids or str(e.get("target")) not in node_ids for e in graph["edges"]):
        return jsonify(error="Bağlantılar geçerli düğüm id'lerine işaret etmelidir."), 400
    mindmap.data = graph
    if data.get("title"):
        mindmap.title = str(data["title"]).strip()[:240]
    db.session.commit()
    return jsonify(id=mindmap.id, status="saved")
