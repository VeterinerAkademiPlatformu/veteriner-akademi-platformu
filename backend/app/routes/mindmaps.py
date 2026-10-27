from datetime import date, datetime, timedelta, timezone

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required, login_user, logout_user
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import CalendarEntry, Flashcard, MindMap, Note, Subject, StudySession, Topic, User
from app.routes.common import owned_card, owned_topic

bp = Blueprint("mindmaps_api", __name__)

@bp.post("/mindmaps")
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

@bp.put("/mindmaps/<int:mindmap_id>")
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
