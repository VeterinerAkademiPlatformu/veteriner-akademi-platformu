from sqlalchemy import select

from app import db
from app.models import Flashcard, Subject, Topic


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
