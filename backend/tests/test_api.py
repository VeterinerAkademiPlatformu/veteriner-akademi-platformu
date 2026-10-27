from app import create_app, db


def make_client(extra_config=None):
    config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "SECRET_KEY": "test-secret-key",
        "SESSION_COOKIE_SECURE": False,
        "RATELIMIT_ENABLED": False,
    }
    if extra_config:
        config.update(extra_config)
    app = create_app(config)
    with app.app_context():
        db.create_all()
    return app, app.test_client()


def csrf_headers(client):
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    return {"X-CSRFToken": response.get_json()["csrf_token"]}


def test_health_endpoint_and_blueprint_registration():
    app, client = make_client()
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    rules = {rule.rule for rule in app.url_map.iter_rules()}
    assert "/api/notes" in rules
    assert "/api/schedule/reschedule" in rules
    assert "/api/mindmaps" in rules
    assert "/api/auth/csrf" in rules


def test_write_requests_require_csrf_token():
    _app, client = make_client()
    response = client.post("/api/auth/register", json={
        "email": "student@example.com",
        "password": "a-strong-test-password",
    })
    assert response.status_code == 400
    assert "CSRF" in response.get_json()["error"]


def test_registration_and_personal_notes_crud():
    app, client = make_client()
    headers = csrf_headers(client)
    registered = client.post("/api/auth/register", json={
        "email": "student@example.com",
        "password": "a-strong-test-password",
    }, headers=headers)
    assert registered.status_code == 201

    headers = csrf_headers(client)
    created = client.post("/api/notes", json={
        "title": "Sınav notum",
        "content": "Aktif hatırlama ile tekrar yap.",
    }, headers=headers)
    assert created.status_code == 201
    note_id = created.get_json()["id"]

    listed = client.get("/api/notes")
    assert listed.status_code == 200
    assert listed.get_json()["notes"][0]["title"] == "Sınav notum"

    headers = csrf_headers(client)
    updated = client.put(f"/api/notes/{note_id}", json={
        "title": "Güncellenmiş not",
        "content": "Aralıklı tekrar.",
    }, headers=headers)
    assert updated.status_code == 200

    headers = csrf_headers(client)
    deleted = client.delete(f"/api/notes/{note_id}", headers=headers)
    assert deleted.status_code == 200
    assert client.get("/api/notes").get_json()["notes"] == []


def test_private_endpoints_require_authentication():
    app, client = make_client()
    response = client.get("/api/notes")
    assert response.status_code == 401


def test_production_rejects_development_secret():
    try:
        create_app({
            "TESTING": True,
            "ENV": "production",
            "SECRET_KEY": "dev-only-change-this-secret",
            "SQLALCHEMY_DATABASE_URI": "sqlite://",
        })
    except RuntimeError as error:
        assert "SECRET_KEY" in str(error)
    else:
        raise AssertionError("Production must reject the development secret")


def test_initial_migration_upgrades_empty_database(tmp_path):
    from sqlalchemy import inspect

    database_path = tmp_path / "migration-test.db"
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
        "SECRET_KEY": "migration-test-secret",
        "SESSION_COOKIE_SECURE": False,
        "RATELIMIT_ENABLED": False,
    })
    result = app.test_cli_runner().invoke(args=["db", "upgrade"])
    assert result.exit_code == 0, result.output

    with app.app_context():
        table_names = set(inspect(db.engine).get_table_names())
    assert {
        "users", "subjects", "topics", "flashcards", "study_sessions",
        "calendar_entries", "notes", "mind_maps", "alembic_version",
    }.issubset(table_names)


def test_cors_allows_only_configured_origin_and_credentials():
    allowed_origin = "https://veterinerakademiplatformu.github.io"
    _app, client = make_client({"CORS_ORIGINS": [allowed_origin]})

    allowed = client.get("/api/health", headers={"Origin": allowed_origin})
    assert allowed.status_code == 200
    assert allowed.headers.get("Access-Control-Allow-Origin") == allowed_origin
    assert allowed.headers.get("Access-Control-Allow-Credentials") == "true"
    assert "Origin" in allowed.headers.get("Vary", "")

    rejected = client.get(
        "/api/health",
        headers={"Origin": "https://example.com"},
    )
    assert rejected.status_code == 200
    assert rejected.headers.get("Access-Control-Allow-Origin") is None


def test_cors_preflight_allows_csrf_header_for_configured_origin():
    origin = "https://veterinerakademiplatformu.github.io"
    _app, client = make_client({"CORS_ORIGINS": [origin]})
    response = client.options(
        "/api/notes",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-csrftoken",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == origin
    assert response.headers.get("Access-Control-Allow-Credentials") == "true"
    assert "X-CSRFToken" in response.headers.get("Access-Control-Allow-Headers", "")
