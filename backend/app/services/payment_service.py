"""
Capa de servicio de pagos.

Separa la lógica de pagos del resto de la aplicación:

    PaymentService
        ↓
    PaymentProvider (stripe | mercadopago | test)
        ↓
    Pasarela de pagos

Nunca almacena datos de tarjetas. Verifica el estado real del pago
en la pasarela y maneja webhooks validados.
"""
import json
import time
import uuid

from flask import current_app, url_for

from ..extensions import db
from ..models import Payment, Order, Coupon, CouponUsage, Inventory, ProductVariant, Product
from .providers import get_provider, PaymentProviderError
from . import receipt_service, email_service


def _idempotency_key(order, method):
    return f"{order.order_number}:{method}:{order.total}"


def _back_urls(order):
    base = current_app.config["FRONTEND_URL"]
    webhook = current_app.config["BACKEND_URL"] + "/api/payments/webhook"
    return {
        "success": f"{base}/pedido/exitoso?order={order.order_number}&status=approved",
        "cancel": f"{base}/pedido/cancelado?order={order.order_number}",
        "pending": f"{base}/pedido/pendiente?order={order.order_number}",
        "failure": f"{base}/pedido/error?order={order.order_number}",
        "webhook": webhook,
    }


def create_payment(order, method):
    """Crea una solicitud de pago y la envía a la pasarela."""
    provider = get_provider()

    payment = Payment(
        order_id=order.id,
        provider=provider.name,
        method=method,
        amount=order.total,
        currency=order.currency or "COP",
        status="pending",
        idempotency_key=_idempotency_key(order, method),
        reference=uuid.uuid4().hex,
        transaction_id=None,
    )
    db.session.add(payment)
    db.session.commit()

    order.payment_status = "processing"
    order.payment_method = method
    db.session.commit()
    order.add_history("pago_iniciado", f"Solicitud de pago creada ({method})")

    try:
        result = provider.create_payment(payment, order, method, _back_urls(order))
        payment.status = result.get("status", "pending")
        if result.get("transaction_id"):
            payment.transaction_id = result["transaction_id"]
        if result.get("reference") and result["reference"] != payment.reference:
            payment.reference = result["reference"]
        db.session.commit()
        return payment, result.get("payment_url"), None
    except PaymentProviderError as exc:
        payment.status = "rejected"
        db.session.commit()
        return payment, None, str(exc)


def verify_payment(payment):
    """Consulta el estado real del pago en la pasarela."""
    provider = get_provider()
    try:
        result = provider.verify(payment)
    except Exception as exc:
        return payment.status, str(exc)
    update_payment_status(payment, result.get("status", payment.status),
                          transaction_id=result.get("transaction_id"))
    return payment.status, None


def handle_webhook(payload, headers):
    """Procesa un webhook de la pasarela con validación de firma."""
    provider = get_provider()
    try:
        info = provider.handle_webhook(payload, headers)
    except PaymentProviderError as exc:
        return {"ok": False, "message": str(exc)}, 400

    payment = _locate_payment(info, payload)
    if payment is None:
        return {"ok": False, "message": "Pago no encontrado"}, 404

    result = provider.verify(payment)
    status = result.get("status")
    if not status and info.get("approved"):
        status = "approved"

    update_payment_status(payment, status or payment.status,
                          transaction_id=result.get("transaction_id"))
    return {"ok": True, "status": payment.status}, 200


def _locate_payment(info, payload):
    reference = info.get("reference") or payload.get("reference")
    txn = info.get("transaction_id") or info.get("payment_id") or payload.get("transaction_id")
    if reference:
        payment = Payment.query.filter_by(reference=str(reference)).first()
        if payment:
            return payment
    if txn:
        payment = Payment.query.filter_by(transaction_id=str(txn)).first()
        if payment:
            return payment
    # Stripe envía client_reference_id con el id del pedido
    for obj in [info.get("session") or {}, payload.get("data", {}).get("object", {})]:
        oid = obj.get("client_reference_id") or obj.get("external_reference")
        if oid:
            order = Order.query.get(int(oid)) if str(oid).isdigit() else Order.query.filter_by(order_number=str(oid)).first()
            if order and order.payments:
                return order.payments[-1]
    return None


def update_payment_status(payment, status, transaction_id=None):
    """Actualiza el estado de un pago de forma idempotente."""
    if transaction_id:
        payment.transaction_id = transaction_id

    if payment.status == status:
        return

    previous = payment.status
    payment.status = status

    if status == "approved":
        _mark_order_paid(payment)
    elif status in ("rejected", "canceled", "expired"):
        order = payment.order
        if order and order.payment_status not in ("approved",):
            order.payment_status = status
            order.add_history("pago_" + status, f"Pago {status} por la pasarela")
            if order.status == "pending":
                pass
        db.session.commit()

    db.session.commit()


def _mark_order_paid(payment):
    """Confirma el pedido únicamente cuando la pasarela lo aprueba."""
    order = payment.order
    if order is None:
        return

    if order.payment_status == "approved" and order.status in ("paid", "preparing", "shipped", "delivered"):
        return  # idempotente: ya procesado

    order.payment_status = "approved"
    order.status = "paid"
    order.payment_transaction = payment.transaction_id or payment.reference
    order.paid_at = db.func.now()
    order.payment_method = payment.method or order.payment_method

    _decrement_stock(order)
    _register_coupon_usage(order)

    db.session.commit()
    order.add_history("paid", "Pago confirmado por la pasarela")

    _after_paid(order, payment)

    db.session.commit()


def _decrement_stock(order):
    from ..models import Product
    for item in order.items:
        product = Product.query.get(item.product_id) if item.product_id else None
        if product:
            product.stock = max(0, product.stock - item.quantity)
            product.sold_count = (product.sold_count or 0) + item.quantity
            db.session.add(Inventory(
                product_id=product.id,
                variant_id=item.variant_id,
                quantity=-item.quantity,
                type="order",
                note=f"Pedido {order.order_number}",
            ))
        if item.variant_id:
            variant = ProductVariant.query.get(item.variant_id)
            if variant:
                variant.stock = max(0, variant.stock - item.quantity)


def _register_coupon_usage(order):
    if not order.coupon_code:
        return
    coupon = Coupon.query.filter_by(code=order.coupon_code).first()
    if not coupon:
        return
    coupon.used_count = (coupon.used_count or 0) + 1
    db.session.add(CouponUsage(coupon_id=coupon.id, user_id=order.user_id, order_id=order.id))


def _after_paid(order, payment):
    """Genera comprobante y envía correo al cliente."""
    try:
        email_service.send_order_confirmation(order)
    except Exception:
        current_app.logger.exception("Error enviando correo del pedido %s", order.order_number)


def create_order_from_cart(user, cart_items, data, shipping, tax_amount, discount, coupon, total):
    """Crea el pedido y sus ítems desde el carrito (usado por checkout)."""
    from ..utils.helpers import generate_order_number
    from ..models import Order, OrderItem

    order = Order(
        order_number=generate_order_number(),
        user_id=user.id if user else None,
        email=data["email"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone=data.get("phone"),
        address=data.get("address"),
        city=data.get("city"),
        state=data.get("state"),
        postal_code=data.get("postal_code"),
        country=data.get("country", "Colombia"),
        shipping_method=shipping["id"],
        shipping_cost=shipping["cost"],
        coupon_code=coupon.code if coupon else None,
        discount=discount,
        tax_amount=tax_amount,
        subtotal=sum(i["subtotal"] for i in cart_items),
        total=total,
        currency=current_app.config.get("STORE_CURRENCY", "COP"),
        payment_status="pending",
        status="pending",
    )
    for item in cart_items:
        order.items.append(OrderItem(
            product_id=item["product_id"],
            variant_id=item.get("variant_id"),
            product_name=item["name"],
            sku=item["sku"],
            variant_name=item.get("variant_name"),
            image=item.get("image"),
            unit_price=item["unit_price"],
            quantity=item["quantity"],
            subtotal=item["subtotal"],
        ))
    db.session.add(order)
    db.session.commit()
    order.add_history("pending", "Pedido creado")
    return order
