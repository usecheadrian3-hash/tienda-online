"""Pedidos: checkout, consulta, comprobantes, seguimiento."""
from flask import Blueprint, request, g, send_file, Response

from ..extensions import db
from ..models import Order, OrderItem, Product, ProductVariant, Coupon, Cart, CartItem
from ..auth import login_required, optional_auth, _resolve_user, admin_required
from ..utils.helpers import ok, error, money
from ..services.settings_service import SettingsService
from ..services import receipt_service, payment_service

bp = Blueprint("orders", __name__, url_prefix="/api/orders")


def _validate_checkout(data):
    errors = {}
    for field in ("first_name", "last_name", "email"):
        if not (data.get(field) or "").strip():
            errors[field] = "Campo requerido"
    email = (data.get("email") or "").strip()
    if email and ("@" not in email or "." not in email.split("@")[-1]):
        errors["email"] = "Email inválido"
    if not (data.get("address") or "").strip():
        errors["address"] = "Dirección requerida"
    if not (data.get("city") or "").strip():
        errors["city"] = "Ciudad requerida"
    if not data.get("shipping_method"):
        errors["shipping_method"] = "Selecciona un método de envío"
    return errors


def _resolve_shipping(method_id, subtotal):
    methods = SettingsService.shipping_methods()
    for m in methods:
        if m.get("id") == method_id and m.get("active", True):
            min_sub = float(m.get("min_subtotal") or 0)
            if subtotal >= min_sub:
                return m
            return None
    return None


@bp.post("")
@optional_auth
def checkout():
    data = request.get_json(silent=True) or {}
    errors = _validate_checkout(data)
    if errors:
        return error("Corrige los campos", 422, errors)

    user = getattr(g, "user", None) or _resolve_user()
    token = request.headers.get("X-Cart-Token")

    if user:
        cart = Cart.query.filter_by(user_id=user.id).first()
    else:
        cart = Cart.query.filter_by(token=token).first() if token else None
    if cart is None or not cart.items:
        return error("Tu carrito está vacío", 422)

    # Validar stock y construir items
    cart_items = []
    for item in cart.items:
        product = item.product
        if product is None or not product.is_active:
            return error("Un producto de tu carrito ya no está disponible", 422)
        variant = item.variant
        available = variant.stock if variant else product.effective_stock()
        if available < item.quantity:
            return error(f"Stock insuficiente para {product.name}", 422)
        cart_items.append({
            "product_id": product.id,
            "variant_id": item.variant_id,
            "name": product.name,
            "sku": product.sku,
            "variant_name": variant.name if variant else None,
            "image": variant.image if variant and variant.image else product.primary_image,
            "unit_price": float(variant.price) if variant and variant.price is not None else float(product.price),
            "quantity": item.quantity,
            "subtotal": float(variant.price) if variant and variant.price is not None else float(product.price),
        })
        cart_items[-1]["subtotal"] *= item.quantity

    subtotal = round(sum(i["subtotal"] for i in cart_items), 2)

    # Envío
    shipping = _resolve_shipping(data.get("shipping_method"), subtotal)
    if shipping is None:
        return error("Método de envío no disponible para este pedido", 422)

    # Cupón
    coupon = None
    discount = 0.0
    coupon_code = (data.get("coupon_code") or "").strip().upper()
    if coupon_code:
        coupon = Coupon.query.filter_by(code=coupon_code).first()
        if coupon is None:
            return error("Cupón no válido", 422)
        valid, msg = coupon.is_valid(subtotal)
        if not valid:
            return error(msg or "Cupón no válido", 422)
        discount = coupon.discount_for(subtotal)

    # Impuestos
    s = SettingsService.get_all()
    tax_rate = float(s.get("tax_rate", 0) or 0) / 100 if s.get("tax_enabled") == "true" else 0
    taxable = subtotal - discount
    tax_amount = round(taxable * tax_rate, 2) if tax_rate else 0.0
    shipping_cost = float(shipping.get("cost", 0))
    total = round(subtotal - discount + shipping_cost + tax_amount, 2)

    order = payment_service.create_order_from_cart(
        user=user,
        cart_items=cart_items,
        data=data,
        shipping=shipping,
        tax_amount=tax_amount,
        discount=discount,
        coupon=coupon,
        total=total,
    )

    # Vaciar carrito tras crear pedido
    for item in cart.items:
        db.session.delete(item)
    db.session.commit()

    return ok({
        "order": order.serialize(),
        "totals": {
            "subtotal": subtotal,
            "discount": round(discount, 2),
            "shipping": shipping_cost,
            "tax": tax_amount,
            "total": total,
            "currency": s.get("currency", "COP"),
            "symbol": SettingsService.currency_symbol(),
        },
    }, 201, "Pedido creado")


@bp.get("/mine")
@login_required
def my_orders():
    items = Order.query.filter_by(user_id=g.user.id) \
        .order_by(Order.created_at.desc()).all()
    return ok([o.serialize() for o in items])


@bp.get("/<order_number>")
@optional_auth
def order_detail(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    user = getattr(g, "user", None)
    if user is None:
        return error("Autenticación requerida", 401)
    if not user.is_admin and order.user_id != user.id:
        return error("No tienes acceso a este pedido", 403)
    data = order.serialize()
    s = SettingsService.get_all()
    data["symbol"] = SettingsService.currency_symbol()
    data["tax_name"] = s.get("tax_name", "Impuesto")
    return ok(data)


@bp.get("/<order_number>/tracking")
@optional_auth
def order_tracking(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    user = getattr(g, "user", None)
    if user is not None and not user.is_admin and order.user_id != user.id:
        return error("No tienes acceso a este pedido", 403)
    timeline = [
        {"step": "Pedido realizado", "done": True,
         "date": order.created_at.isoformat() + "Z" if order.created_at else None},
        {"step": "Pago confirmado", "done": order.payment_status == "approved",
         "date": order.paid_at.isoformat() + "Z" if order.paid_at else None},
        {"step": "Preparando", "done": order.status in ("preparing", "shipped", "delivered"),
         "date": _history_date(order, "preparing")},
        {"step": "Enviado", "done": order.status in ("shipped", "delivered"),
         "date": _history_date(order, "shipped")},
        {"step": "Entregado", "done": order.status == "delivered",
         "date": _history_date(order, "delivered")},
    ]
    if order.status == "canceled":
        timeline = [{"step": "Pedido cancelado", "done": True,
                     "date": _history_date(order, "canceled")}]
    return ok({"order": order.serialize(with_items=False), "timeline": timeline})


def _history_date(order, status):
    for h in order.history:
        if h.status == status:
            return h.created_at.isoformat() + "Z" if h.created_at else None
    return None


@bp.get("/<order_number>/receipt")
@optional_auth
def receipt_html(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    if order.payment_status != "approved":
        return error("El comprobante se genera cuando el pago es confirmado", 403)
    user = getattr(g, "user", None)
    if user is not None and not user.is_admin and order.user_id != user.id:
        return error("No tienes acceso", 403)
    html = receipt_service.render_receipt_html(order)
    return Response(html, mimetype="text/html")


@bp.get("/<order_number>/receipt.pdf")
@optional_auth
def receipt_pdf(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    if order.payment_status != "approved":
        return error("El comprobante se genera cuando el pago es confirmado", 403)
    user = getattr(g, "user", None)
    if user is not None and not user.is_admin and order.user_id != user.id:
        return error("No tienes acceso", 403)
    pdf = receipt_service.render_receipt_pdf(order)
    return send_file(
        _bytes_io(pdf),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"comprobante-{order.order_number}.pdf",
    )


def _bytes_io(data):
    import io
    return io.BytesIO(data)


@bp.post("/<order_number>/cancel")
@login_required
def cancel_order(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    if order.user_id != g.user.id:
        return error("No tienes acceso", 403)
    if order.status not in ("pending", "paid"):
        return error("No se puede cancelar este pedido", 422)
    if order.payment_status == "approved":
        return error("El pedido ya fue pagado, contacta soporte", 422)
    order.status = "canceled"
    order.payment_status = "canceled"
    db.session.commit()
    order.add_history("canceled", "Cancelado por el cliente")
    return ok(None, 200, "Pedido cancelado")
