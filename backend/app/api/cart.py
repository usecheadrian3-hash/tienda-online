"""Carrito de compras (persistente, con o sin sesión)."""
import secrets

from flask import Blueprint, request, g

from ..extensions import db
from ..models import Cart, CartItem, Product, ProductVariant
from ..auth import _resolve_user
from ..utils.helpers import ok, error

bp = Blueprint("cart", __name__, url_prefix="/api/cart")


def _get_or_create_cart():
    """Devuelve el carrito del usuario o el carrito anónimo (token)."""
    user = _resolve_user()
    if user:
        cart = Cart.query.filter_by(user_id=user.id).first()
        if cart:
            return cart, True
        # Asociar carrito anónimo
        token = request.headers.get("X-Cart-Token")
        anon = Cart.query.filter_by(token=token).first() if token else None
        if anon:
            anon.user_id = user.id
            anon.token = None
            db.session.commit()
            return anon, True
        cart = Cart(user_id=user.id)
        db.session.add(cart)
        db.session.commit()
        return cart, True

    token = request.headers.get("X-Cart-Token")
    if not token:
        token = secrets.token_hex(32)
    cart = Cart.query.filter_by(token=token).first()
    if cart is None:
        cart = Cart(token=token)
        db.session.add(cart)
        db.session.commit()
    return cart, False


def _cart_response(cart, new_token=None):
    data = cart.serialize()
    if new_token:
        data["token"] = new_token
    return data


@bp.get("")
def get_cart():
    cart, created = _get_or_create_cart()
    return ok(_cart_response(cart, cart.token if created else None))


@bp.post("/items")
def add_item():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    variant_id = data.get("variant_id")
    quantity = int(data.get("quantity", 1) or 1)
    if quantity < 1:
        quantity = 1

    product = Product.query.filter_by(id=product_id, is_active=True).first()
    if product is None:
        return error("Producto no encontrado", 404)

    variant = None
    if variant_id:
        variant = ProductVariant.query.filter_by(id=variant_id, product_id=product.id).first()
        if variant is None or not variant.is_active:
            return error("Variante no disponible", 404)

    available = variant.stock if variant else product.effective_stock()
    if available < quantity:
        return error(f"Solo hay {available} unidades disponibles", 422)

    cart, _ = _get_or_create_cart()
    item = CartItem.query.filter_by(
        cart_id=cart.id, product_id=product.id, variant_id=variant_id
    ).first()
    if item:
        item.quantity = min(item.quantity + quantity, available)
    else:
        item = CartItem(cart_id=cart.id, product_id=product.id,
                        variant_id=variant_id, quantity=quantity)
        db.session.add(item)
    db.session.commit()
    return ok(_cart_response(cart), 201, "Producto agregado al carrito")


@bp.put("/items/<int:item_id>")
def update_item(item_id):
    data = request.get_json(silent=True) or {}
    quantity = int(data.get("quantity", 1) or 1)
    cart, _ = _get_or_create_cart()
    item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    if item is None:
        return error("Item no encontrado", 404)
    available = item.variant.stock if item.variant else item.product.effective_stock()
    if quantity > available:
        return error(f"Solo hay {available} unidades disponibles", 422)
    if quantity < 1:
        db.session.delete(item)
    else:
        item.quantity = quantity
    db.session.commit()
    return ok(_cart_response(cart))


@bp.delete("/items/<int:item_id>")
def remove_item(item_id):
    cart, _ = _get_or_create_cart()
    item = CartItem.query.filter_by(id=item_id, cart_id=cart.id).first()
    if item:
        db.session.delete(item)
        db.session.commit()
    return ok(_cart_response(cart), 200, "Producto eliminado del carrito")


@bp.delete("")
def clear_cart():
    cart, _ = _get_or_create_cart()
    for item in cart.items:
        db.session.delete(item)
    db.session.commit()
    return ok(_cart_response(cart), 200, "Carrito vaciado")
