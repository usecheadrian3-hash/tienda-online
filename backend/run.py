"""Punto de entrada del backend.

Uso:
    python run.py
"""
from app import create_app
from app.extensions import db
from app.models import User

app = create_app()

with app.app_context():
    try:
        if User.query.count() == 0:
            from seed import main as run_seed

            run_seed()
            print("Seed de demostración cargado.")
    except Exception as exc:
        app.logger.error("No se pudo cargar el seed: %s", exc)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=app.config["DEBUG"])
