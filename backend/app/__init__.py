from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = None


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object("app.config.Config")
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        from app.models import User
        try:
            return db.session.get(User, int(user_id))
        except (TypeError, ValueError):
            return None

    from app import models  # noqa: F401
    from app.routes.api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "veteriner-akademi-study-api"})

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Kaynak bulunamadı."}), 404

    @app.errorhandler(400)
    def bad_request(_error):
        return jsonify({"error": "Geçersiz istek."}), 400

    return app
