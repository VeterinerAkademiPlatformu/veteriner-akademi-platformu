from datetime import datetime, timezone

from app import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    subjects = db.relationship("Subject", back_populates="user", cascade="all, delete-orphan")


class Subject(db.Model):
    __tablename__ = "subjects"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = db.Column(db.String(160), nullable=False)
    color = db.Column(db.String(24), nullable=False, default="#27c4b8")
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    user = db.relationship("User", back_populates="subjects")
    topics = db.relationship("Topic", back_populates="subject", cascade="all, delete-orphan")


class Topic(db.Model):
    __tablename__ = "topics"
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(240), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    estimated_minutes = db.Column(db.Integer, nullable=False, default=25)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    completed_at = db.Column(db.DateTime(timezone=True))
    subject = db.relationship("Subject", back_populates="topics")
    flashcards = db.relationship("Flashcard", back_populates="topic", cascade="all, delete-orphan")


class Flashcard(db.Model):
    __tablename__ = "flashcards"
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    ease_factor = db.Column(db.Float, nullable=False, default=2.5)
    interval_days = db.Column(db.Integer, nullable=False, default=0)
    repetitions = db.Column(db.Integer, nullable=False, default=0)
    next_review_date = db.Column(db.Date, index=True)
    last_reviewed_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    topic = db.relationship("Topic", back_populates="flashcards")


class StudySession(db.Model):
    __tablename__ = "study_sessions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    session_type = db.Column(db.String(24), nullable=False, default="pomodoro")
    duration_minutes = db.Column(db.Integer, nullable=False)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False)
    ended_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class CalendarEntry(db.Model):
    __tablename__ = "calendar_entries"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    study_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(16), nullable=False, default="planned")
    planned_minutes = db.Column(db.Integer, nullable=False, default=25)
    completed_minutes = db.Column(db.Integer, nullable=False, default=0)
    order_index = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)


class Note(db.Model):
    __tablename__ = "notes"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    title = db.Column(db.String(240), nullable=False)
    content = db.Column(db.Text, nullable=False, default="")
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class MindMap(db.Model):
    __tablename__ = "mind_maps"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("topics.id", ondelete="SET NULL"), nullable=True, index=True)
    title = db.Column(db.String(240), nullable=False)
    data = db.Column(db.JSON, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
