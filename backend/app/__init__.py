from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_wtf.csrf import CSRFError, CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = None
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
)


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    if test_config:
        app.config.update(test_config)

    if app.config.get("ENV") == "production" and app.config.get("SECRET_KEY") == "dev-only-change-this-secret":
        raise RuntimeError("Production ortamında güçlü bir SECRET_KEY tanımlanmalıdır.")

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User
        try:
            return db.session.get(User, int(user_id))
        except (TypeError, ValueError):
            return None

    from app import models  # noqa: F401
    from app.routes.auth import bp as auth_bp
    from app.routes.flashcards import bp as flashcards_bp
    from app.routes.schedule import bp as schedule_bp
    from app.routes.pomodoro import bp as pomodoro_bp
    from app.routes.calendar import bp as calendar_bp
    from app.routes.notes import bp as notes_bp
    from app.routes.mindmaps import bp as mindmaps_bp

    for blueprint in (
        auth_bp, flashcards_bp, schedule_bp, pomodoro_bp,
        calendar_bp, notes_bp, mindmaps_bp,
    ):
        app.register_blueprint(blueprint, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "veteriner-akademi-study-api"})

    @app.errorhandler(CSRFError)
    def csrf_error(_error):
        return jsonify({"error": "CSRF doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin."}), 400

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Kaynak bulunamadı."}), 404

    @app.errorhandler(400)
    def bad_request(_error):
        return jsonify({"error": "Geçersiz istek."}), 400

    return app
