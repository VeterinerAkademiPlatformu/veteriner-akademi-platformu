from datetime import date
from app import create_app, db
from app.models import User, Subject, Topic, CalendarEntry
from app.services.scheduler import generate_schedule, reschedule_unfinished


def setup_db():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://", "SECRET_KEY": "test-secret"})
    with app.app_context():
        db.create_all()
        user = User(email="student@example.com", password_hash="not-a-real-login-hash")
        db.session.add(user)
        db.session.flush()
        subject = Subject(user_id=user.id, name="Histology")
        db.session.add(subject)
        db.session.flush()
        topics = [Topic(subject_id=subject.id, title=f"Topic {i}", estimated_minutes=25) for i in range(3)]
        db.session.add_all(topics)
        db.session.commit()
        return app, user.id, subject.id, [topic.id for topic in topics]


def test_generate_schedule_spreads_topics_across_days():
    app, user_id, subject_id, topic_ids = setup_db()
    with app.app_context():
        entries = generate_schedule(user_id, subject_id, date(2026, 11, 1), topic_ids, date(2026, 10, 27))
        assert len(entries) == 3
        assert [e["date"] for e in entries] == ["2026-10-27", "2026-10-28", "2026-10-29"]


def test_reschedule_moves_overdue_and_future_planned_entries():
    app, user_id, subject_id, topic_ids = setup_db()
    with app.app_context():
        db.session.add(CalendarEntry(user_id=user_id, topic_id=topic_ids[0], study_date=date(2026, 10, 26), status="planned", planned_minutes=25))
        db.session.add(CalendarEntry(user_id=user_id, topic_id=topic_ids[1], study_date=date(2026, 10, 28), status="planned", planned_minutes=25))
        db.session.add(CalendarEntry(user_id=user_id, topic_id=topic_ids[2], study_date=date(2026, 10, 26), status="completed", planned_minutes=25, completed_minutes=25))
        db.session.commit()
        moved = reschedule_unfinished(user_id, date(2026, 11, 1), date(2026, 10, 27))
        assert len(moved) == 2
        assert all(item["date"] >= "2026-10-27" for item in moved)
        completed = db.session.query(CalendarEntry).filter_by(status="completed").all()
        assert len(completed) == 1
