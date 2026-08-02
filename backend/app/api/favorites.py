"""Favoritos del usuario."""
from flask import Blueprint, request, g

from ..extensions import db
from ..models import Favorite, Product
from ..auth import login_required, optional_auth
from ..utils.helpers import ok, error

bp = Blueprint("favorites", __name__, url_prefix="/api/favorites")


@bp.get("")
@login_required
def list_favorites():
    items = Favorite.query.filter_by(user_id=g.user.id).order_by(Favorite.created_at.desc()).all()
    return ok([f.product.serialize() for f in items if f.product and f.product.is_active])


@bp.get("/ids")
@optional_auth
def favorite_ids():
    user = getattr(g, "user", None) or _auth_user()
    if not user:
        return ok([])
    rows = db.session.query(Favorite.product_id).filter_by(user_id=user.id).all()
    return ok([r[0] for r in rows])


def _auth_user():
    from ..auth import _resolve_user
    return _resolve_user()


@bp.post("/<int:product_id>")
@login_required
def add_favorite(product_id):
    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if product is None:
        return error("Producto no encontrado", 404)
    existing = Favorite.query.filter_by(user_id=g.user.id, product_id=product_id).first()
    if not existing:
        db.session.add(Favorite(user_id=g.user.id, product_id=product_id))
        db.session.commit()
    return ok(None, 201, "Agregado a favoritos")


@bp.delete("/<int:product_id>")
@login_required
def remove_favorite(product_id):
    fav = Favorite.query.filter_by(user_id=g.user.id, product_id=product_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return ok(None, 200, "Eliminado de favoritos")
