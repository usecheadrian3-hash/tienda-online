"""
Configuración central de la tienda.
Los valores se cargan desde variables de entorno (.env) y se
complementan con la tabla `settings` de MySQL (admin panel).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Cargar .env del proyecto y del backend
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env")


def env(key, default=None):
    return os.environ.get(key, default)


def env_bool(key, default=False):
    val = os.environ.get(key)
    if val is None:
        return default
    return str(val).lower() in ("1", "true", "yes", "on")


class Config:
    # App
    APP_ENV = env("APP_ENV", "development")
    DEBUG = env_bool("APP_DEBUG", True)
    SECRET_KEY = env("APP_SECRET_KEY", "dev-secret-change-me")
    FRONTEND_URL = env("FRONTEND_URL", "http://localhost:5173")
    BACKEND_URL = env("BACKEND_URL", "http://localhost:5000")
    JSON_SORT_KEYS = False
    MAX_CONTENT_LENGTH = int(env("MAX_CONTENT_LENGTH_MB", 8)) * 1024 * 1024

    # Base de datos
    # Producción (Ubuntu): DB_DRIVER=mysql  ->  MySQL + PyMySQL
    # Desarrollo local sin MySQL: DB_DRIVER=sqlite (solo prueba, no producción)
    DB_DRIVER = env("DB_DRIVER", "mysql").lower()
    if DB_DRIVER == "sqlite":
        SQLALCHEMY_DATABASE_URI = "sqlite:///" + str(BACKEND_DIR / "dev.sqlite3")
        SQLALCHEMY_ENGINE_OPTIONS = {}
    else:
        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{env('DB_USER', 'ecommerce')}:{env('DB_PASSWORD', 'ecommerce')}"
            f"@{env('DB_HOST', 'localhost')}:{env('DB_PORT', '3306')}/{env('DB_NAME', 'ecommerce')}"
            f"?charset=utf8mb4"
        )
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_size": int(env("DB_POOL_SIZE", 10)),
            "pool_recycle": int(env("DB_POOL_RECYCLE", 1800)),
            "pool_pre_ping": True,
        }
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = env("JWT_SECRET_KEY", env("SECRET_KEY", "dev-jwt-secret"))
    JWT_EXPIRES_MINUTES = int(env("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", 1440))

    # Uploads
    UPLOAD_FOLDER = os.path.join(BACKEND_DIR, env("UPLOAD_FOLDER", "uploads"))
    ALLOWED_IMAGE_EXT = {"jpg", "jpeg", "png", "webp", "avif", "gif", "svg"}

    # Pagos
    PAYMENT_PROVIDER = env("PAYMENT_PROVIDER", "test")
    STRIPE_PUBLISHABLE_KEY = env("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET = env("STRIPE_WEBHOOK_SECRET", "")
    MERCADOPAGO_ACCESS_TOKEN = env("MERCADOPAGO_ACCESS_TOKEN", "")
    MERCADOPAGO_PUBLIC_KEY = env("MERCADOPAGO_PUBLIC_KEY", "")
    MERCADOPAGO_WEBHOOK_SECRET = env("MERCADOPAGO_WEBHOOK_SECRET", "")

    # Email
    MAIL_ENABLED = env_bool("MAIL_ENABLED", False)
    MAIL_HOST = env("MAIL_HOST", "smtp.gmail.com")
    MAIL_PORT = int(env("MAIL_PORT", 587))
    MAIL_USE_TLS = env_bool("MAIL_USE_TLS", True)
    MAIL_USER = env("MAIL_USER", "")
    MAIL_PASSWORD = env("MAIL_PASSWORD", "")
    MAIL_FROM = env("MAIL_FROM", "noreply@tienda.com")
    MAIL_FROM_NAME = env("MAIL_FROM_NAME", "Mi Tienda")
