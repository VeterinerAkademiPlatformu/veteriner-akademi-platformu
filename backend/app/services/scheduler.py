from datetime import date, timedelta

from sqlalchemy import select

from app import db
from app.models import CalendarEntry, Subject, Topic


def generate_schedule(user_id, subject_id, exam_date, topic_ids, today=None):
    """Replace future planned entries for the selected incomplete topics."""
    today = today or date.today()
    subject = db.session.scalar(select(Subject).where(
        Subject.id == subject_id, Subject.user_id == user_id
    ))
    if not subject:
        raise LookupError("Ders bulunamadı.")
    if exam_date <= today:
        raise ValueError("Sınav tarihi bugünden sonra olmalıdır.")

    unique_ids = list(dict.fromkeys(topic_ids))
    topics = db.session.scalars(select(Topic).where(
        Topic.subject_id == subject_id,
        Topic.id.in_(unique_ids),
        Topic.completed.is_(False),
    ).order_by(Topic.sort_order, Topic.id)).all() if unique_ids else []
    if len(topics) != len(unique_ids):
        raise ValueError("Konu listesindeki bazı kayıtlar bulunamadı veya tamamlandı.")

    for topic in topics:
        db.session.query(CalendarEntry).filter(
            CalendarEntry.user_id == user_id,
            CalendarEntry.topic_id == topic.id,
            CalendarEntry.status == "planned",
            CalendarEntry.study_date >= today,
        ).delete(synchronize_session=False)

    available_days = (exam_date - today).days
    created = []
    for index, topic in enumerate(topics):
        study_day = today + timedelta(days=index % available_days)
        entry = CalendarEntry(
            user_id=user_id,
            topic_id=topic.id,
            study_date=study_day,
            status="planned",
            planned_minutes=max(10, topic.estimated_minutes or 25),
            completed_minutes=0,
            order_index=index,
        )
        db.session.add(entry)
        created.append({"topic_id": topic.id, "date": study_day.isoformat()})
    return created


def reschedule_unfinished(user_id, exam_date, today=None):
    """Move overdue and future planned work into the remaining pre-exam days.

    Completed entries remain as historical records. Existing future planned
    entries are replaced so a topic is not accidentally duplicated.
    """
    today = today or date.today()
    if exam_date <= today:
        raise ValueError("Sınav tarihi bugünden sonra olmalıdır.")

    overdue = db.session.scalars(select(CalendarEntry).where(
        CalendarEntry.user_id == user_id,
        CalendarEntry.status == "planned",
        CalendarEntry.study_date < today,
    ).order_by(CalendarEntry.study_date, CalendarEntry.order_index)).all()

    future = db.session.scalars(select(CalendarEntry).where(
        CalendarEntry.user_id == user_id,
        CalendarEntry.status == "planned",
        CalendarEntry.study_date >= today,
        CalendarEntry.study_date < exam_date,
    ).order_by(CalendarEntry.study_date, CalendarEntry.order_index)).all()

    topic_ids = list(dict.fromkeys([entry.topic_id for entry in overdue + future]))
    # Remove only planned entries being reallocated; completed history is untouched.
    for entry in overdue + future:
        db.session.delete(entry)

    topics = db.session.scalars(select(Topic).join(Subject).where(
        Subject.user_id == user_id,
        Topic.id.in_(topic_ids),
        Topic.completed.is_(False),
    ).order_by(Topic.sort_order, Topic.id)).all() if topic_ids else []

    days = (exam_date - today).days
    moved = []
    for index, topic in enumerate(topics):
        study_day = today + timedelta(days=index % days)
        entry = CalendarEntry(
            user_id=user_id,
            topic_id=topic.id,
            study_date=study_day,
            status="planned",
            planned_minutes=max(10, topic.estimated_minutes or 25),
            completed_minutes=0,
            order_index=index,
        )
        db.session.add(entry)
        moved.append({"topic_id": topic.id, "date": study_day.isoformat()})

    db.session.flush()
    return moved
