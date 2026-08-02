"""Autenticación: registro, login, perfil, contraseña y direcciones."""
import re

from flask import Blueprint, request, g

from ..extensions import db
from ..models import User, Address, Cart
from ..auth import login_required, create_token, _resolve_user
from ..utils.helpers import ok, error

bp = Blueprint("auth", __name__, url_prefix="/api")


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[+\d][\d\s\-()]{6,20}$")


def _validate_password(password):
    if len(password) < 8:
        return "La contraseña debe tener al menos 8 caracteres"
    return None


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone") or "").strip()
    password = data.get("password") or ""
    confirm = data.get("confirm_password") or ""

    errors = {}
    if len(name) < 2:
        errors["name"] = "Ingresa tu nombre completo"
    if not EMAIL_RE.match(email):
        errors["email"] = "Email inválido"
    if phone and not PHONE_RE.match(phone):
        errors["phone"] = "Teléfono inválido"
    pwd_error = _validate_password(password)
    if pwd_error:
        errors["password"] = pwd_error
    if password != confirm:
        errors["confirm_password"] = "Las contraseñas no coinciden"
    if errors:
        return error("Corrige los campos", 422, errors)

    if User.query.filter_by(email=email).first():
        return error("Ya existe una cuenta con este email", 409, {"email": "Email en uso"})

    user = User(name=name, email=email, phone=phone, role_id=2)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Asociar carrito anónimo existente
    token = request.headers.get("X-Cart-Token")
    if token:
        cart = Cart.query.filter_by(token=token).first()
        if cart:
            cart.user_id = user.id
            db.session.commit()

    token_jwt = create_token(user)
    return ok({"token": token_jwt, "user": user.serialize()}, 201, "Cuenta creada correctamente")


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = User.query.filter_by(email=email).first()
    if user is None or not user.check_password(password):
        return error("Credenciales incorrectas", 401)
    if not user.is_active:
        return error("Tu cuenta está desactivada", 403)
    user.last_login_at = db.func.now()
    db.session.commit()

    token = create_token(user)
    return ok({"token": token, "user": user.serialize()}, 200, "Bienvenido de nuevo")


@bp.get("/me")
@login_required
def me():
    return ok(g.user.serialize())


@bp.put("/me")
@login_required
def update_me():
    data = request.get_json(silent=True) or {}
    user = g.user
    if data.get("name"):
        user.name = (data.get("name") or "").strip()
    if data.get("phone") is not None:
        user.phone = (data.get("phone") or "").strip()
    if data.get("email"):
        new_email = (data.get("email") or "").strip().lower()
        if new_email != user.email:
            if not EMAIL_RE.match(new_email):
                return error("Email inválido", 422)
            if User.query.filter(User.email == new_email, User.id != user.id).first():
                return error("Email en uso", 409)
            user.email = new_email
    db.session.commit()
    return ok(user.serialize(), 200, "Perfil actualizado")


@bp.put("/me/password")
@login_required
def change_password():
    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new_password = data.get("new_password") or ""
    if not g.user.check_password(current):
        return error("La contraseña actual es incorrecta", 422)
    pwd_error = _validate_password(new_password)
    if pwd_error:
        return error(pwd_error, 422)
    g.user.set_password(new_password)
    db.session.commit()
    return ok(None, 200, "Contraseña actualizada")


# ---------- Direcciones ----------

@bp.get("/me/addresses")
@login_required
def list_addresses():
    return ok([a.serialize() for a in g.user.addresses])


@bp.post("/me/addresses")
@login_required
def create_address():
    data = request.get_json(silent=True) or {}
    errors = {}
    if not (data.get("first_name") or "").strip():
        errors["first_name"] = "Nombre requerido"
    if not (data.get("last_name") or "").strip():
        errors["last_name"] = "Apellido requerido"
    if not (data.get("address") or "").strip():
        errors["address"] = "Dirección requerida"
    if not (data.get("city") or "").strip():
        errors["city"] = "Ciudad requerida"
    if errors:
        return error("Corrige los campos", 422, errors)

    if data.get("is_default"):
        for addr in g.user.addresses:
            addr.is_default = False

    addr = Address(
        user_id=g.user.id,
        label=(data.get("label") or "Principal").strip(),
        first_name=data["first_name"].strip(),
        last_name=data["last_name"].strip(),
        phone=(data.get("phone") or "").strip(),
        address=data["address"].strip(),
        city=data["city"].strip(),
        state=(data.get("state") or "").strip(),
        postal_code=(data.get("postal_code") or "").strip(),
        country=(data.get("country") or "Colombia").strip(),
        is_default=bool(data.get("is_default", False)),
    )
    db.session.add(addr)
    db.session.commit()
    return ok(addr.serialize(), 201, "Dirección guardada")


@bp.put("/me/addresses/<int:address_id>")
@login_required
def update_address(address_id):
    addr = Address.query.filter_by(id=address_id, user_id=g.user.id).first()
    if addr is None:
        return error("Dirección no encontrada", 404)
    data = request.get_json(silent=True) or {}
    for field in ("label", "first_name", "last_name", "phone", "address",
                  "city", "state", "postal_code", "country"):
        if data.get(field) is not None:
            setattr(addr, field, str(data[field]).strip())
    if data.get("is_default"):
        for a in g.user.addresses:
            a.is_default = False
        addr.is_default = True
    db.session.commit()
    return ok(addr.serialize(), 200, "Dirección actualizada")


@bp.delete("/me/addresses/<int:address_id>")
@login_required
def delete_address(address_id):
    addr = Address.query.filter_by(id=address_id, user_id=g.user.id).first()
    if addr is None:
        return error("Dirección no encontrada", 404)
    db.session.delete(addr)
    db.session.commit()
    return ok(None, 200, "Dirección eliminada")
