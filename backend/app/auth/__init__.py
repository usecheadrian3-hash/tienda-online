from functools import wraps
from datetime import datetime, timedelta, timezone

import jwt
from flask import request, g, current_app

from ..models import User


def now_utc():
    return datetime.now(timezone.utc)


def create_token(user):
    payload = {
        "sub": str(user.id),
        "role": user.role.name if user.role else "customer",
        "iat": now_utc(),
        "exp": now_utc() + timedelta(minutes=current_app.config["JWT_EXPIRES_MINUTES"]),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


def decode_token(token):
    return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])


def get_current_user():
    """Devuelve el usuario autenticado o None."""
    user_id = getattr(g, "user_id", None)
    if user_id is None:
        return None
    return User.query.get(user_id)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _resolve_user()
        if user is None:
            return {"ok": False, "message": "Autenticación requerida"}, 401
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def optional_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        _resolve_user()
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _resolve_user()
        if user is None:
            return {"ok": False, "message": "Autenticación requerida"}, 401
        if not user.is_admin:
            return {"ok": False, "message": "Acceso restringido"}, 403
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


def _resolve_user():
    """Resuelve el usuario desde el header Authorization (Bearer token)."""
    user_id = getattr(g, "user_id", None)
    if user_id is not None:
        user = User.query.get(user_id)
        g.user = user
        return user

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        g.user_id = None
        g.user = None
        return None
    token = auth.split(" ", 1)[1]
    try:
        payload = decode_token(token)
        uid = int(payload.get("sub"))
        user = User.query.get(uid)
        if user is None or not user.is_active:
            g.user_id = None
            g.user = None
            return None
        g.user_id = uid
        g.user = user
        return user
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, TypeError):
        g.user_id = None
        g.user = None
        return None
