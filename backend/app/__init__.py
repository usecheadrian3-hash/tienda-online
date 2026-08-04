"""Fábrica de la aplicación Flask."""
import os

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

from .config import Config
from .extensions import db
from .api import register_blueprints


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    CORS(app, resources={
        r"/api/*": {"origins": [app.config["FRONTEND_URL"], "*"],
                    "supports_credentials": True}
    })

    db.init_app(app)

    from . import models  # noqa: F401  asegura registro de modelos
    register_blueprints(app)

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True, "app": "tienda-api"})

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"ok": False, "message": "Recurso no encontrado"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify({"ok": False, "message": "Método no permitido"}), 405

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({"ok": False, "message": "Error interno del servidor"}), 500

    _frontend_dist = os.path.abspath(
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "frontend", "dist")
    )

    if os.path.isfile(os.path.join(_frontend_dist, "index.html")):
        @app.get("/", defaults={"path": ""})
        @app.get("/<path:path>")
        def spa_fallback(path):
            if path.startswith("api/"):
                return jsonify({"ok": False, "message": "Recurso no encontrado"}), 404
            full = os.path.join(_frontend_dist, path)
            if path and os.path.isfile(full):
                return send_from_directory(_frontend_dist, path)
            return send_from_directory(_frontend_dist, "index.html")

    with app.app_context():
        try:
            db.create_all()
        except Exception as exc:  # pragma: no cover
            app.logger.error("No se pudo inicializar la base de datos: %s", exc)

    return app
