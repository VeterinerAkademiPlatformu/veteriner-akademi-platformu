from app import create_app, db


def make_client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret-key",
        "SESSION_COOKIE_SECURE": False,
    })
    with app.app_context():
        db.create_all()
    return app, app.test_client()


def test_health_endpoint_and_blueprint_registration():
    app, client = make_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    rules = {rule.rule for rule in app.url_map.iter_rules()}
    assert "/api/notes" in rules
    assert "/api/schedule/reschedule" in rules
    assert "/api/mindmaps" in rules


def test_registration_and_personal_notes_crud():
    app, client = make_client()
    registered = client.post("/api/auth/register", json={
        "email": "student@example.com",
        "password": "a-strong-test-password",
    })
    assert registered.status_code == 201

    created = client.post("/api/notes", json={
        "title": "Sınav notum",
        "content": "Aktif hatırlama ile tekrar yap.",
    })
    assert created.status_code == 201
    note_id = created.get_json()["id"]

    listed = client.get("/api/notes")
    assert listed.status_code == 200
    assert listed.get_json()["notes"][0]["title"] == "Sınav notum"

    updated = client.put(f"/api/notes/{note_id}", json={
        "title": "Güncellenmiş not",
        "content": "Aralıklı tekrar.",
    })
    assert updated.status_code == 200

    deleted = client.delete(f"/api/notes/{note_id}")
    assert deleted.status_code == 200
    assert client.get("/api/notes").get_json()["notes"] == []


def test_private_endpoints_require_authentication():
    app, client = make_client()
    response = client.get("/api/notes")
    assert response.status_code == 401
