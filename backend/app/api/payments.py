"""Pagos: iniciar, confirmar, webhooks, pasarela de prueba."""
from flask import Blueprint, request, Response, redirect, g

from ..extensions import db
from ..models import Order, Payment
from ..auth import login_required, optional_auth, _resolve_user
from ..utils.helpers import ok, error
from ..services import payment_service

bp = Blueprint("payments", __name__, url_prefix="/api/payments")


@bp.post("/<order_number>")
@optional_auth
def initiate(order_number):
    """Crea la solicitud de pago para un pedido."""
    data = request.get_json(silent=True) or {}
    method = (data.get("method") or "").strip().lower()
    valid_methods = {"pse", "bancolombia", "card", "test"}
    if method not in valid_methods:
        return error("Método de pago no soportado", 422)

    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    user = getattr(g, "user", None)
    if user is not None and not user.is_admin and order.user_id != user.id:
        return error("No tienes acceso a este pedido", 403)

    if order.payment_status == "approved":
        return ok({"order": order.order_number, "payment_status": "approved",
                   "payment_url": None, "message": "Este pedido ya fue pagado"})

    if order.payment_status in ("processing",) and order.payments:
        latest = order.payments[-1]
        if latest and latest.status in ("pending", "processing"):
            provider = payment_service.get_provider()
            payment_url = provider.redirect_url(latest) if provider.name == "test" else None
            return ok({"order": order.order_number, "payment_status": latest.status,
                       "payment_url": payment_url, "reference": latest.reference})

    payment, payment_url, err = payment_service.create_payment(order, method)
    if err:
        return error(err, 502)
    return ok({
        "order": order.order_number,
        "payment_status": payment.status,
        "payment_url": payment_url,
        "reference": payment.reference,
        "transaction_id": payment.transaction_id,
    }, 200, "Redirigiendo a la pasarela de pagos")


@bp.post("/confirm")
def confirm():
    """
    Se llama cuando el cliente regresa de la pasarela.
    NUNCA marca el pedido como pagado solo por llegar aquí:
    verifica el estado real en la pasarela.
    """
    data = request.get_json(silent=True) or {}
    reference = data.get("reference") or data.get("transaction_id")
    order_number = data.get("order_number")
    if not reference and not order_number:
        return error("Falta referencia del pago", 422)

    payment = None
    if reference:
        payment = Payment.query.filter(
            (Payment.reference == reference) | (Payment.transaction_id == reference)
        ).first()
    if payment is None and order_number:
        order = Order.query.filter_by(order_number=order_number).first()
        if order and order.payments:
            payment = order.payments[-1]
    if payment is None:
        return error("Pago no encontrado", 404)

    status, err = payment_service.verify_payment(payment)
    order = payment.order
    return ok({
        "order": order.order_number if order else None,
        "payment_status": status,
        "approved": status == "approved",
        "message": ("Pago confirmado" if status == "approved" else
                    "Pago pendiente de confirmación"),
    })


@bp.get("/status")
def status():
    """Consulta el estado de un pago (para polling del frontend)."""
    reference = request.args.get("reference") or request.args.get("transaction_id")
    if not reference:
        return error("Falta referencia", 422)
    payment = Payment.query.filter(
        (Payment.reference == reference) | (Payment.transaction_id == reference)
    ).first()
    if payment is None:
        return error("Pago no encontrado", 404)
    status, err = payment_service.verify_payment(payment)
    return ok({
        "status": status,
        "approved": status == "approved",
        "order": payment.order.order_number if payment.order else None,
        "payment_method": payment.method,
        "total": float(payment.amount),
        "transaction_id": payment.transaction_id,
    })


@bp.post("/webhook")
def webhook():
    """Recibe actualizaciones de la pasarela (validado en backend)."""
    payload = request.get_json(silent=True) or {}
    return payment_service.handle_webhook(payload, request.headers)


# ============================================================
# PASARELA DE PRUEBA (SOLO ENTORNO DE DESARROLLO)
# ============================================================
@bp.route("/test/gateway/<reference>", methods=["GET", "POST"])
def test_gateway(reference):
    from ..services.settings_service import SettingsService
    from ..auth import admin_required

    payment = Payment.query.filter_by(reference=reference).first()
    if payment is None:
        return "Pago no encontrado", 404

    # Verificar que estamos en entorno de prueba
    from flask import current_app
    if current_app.config["PAYMENT_PROVIDER"] != "test":
        return "Pasarela de prueba deshabilitada", 403

    if request.method == "POST":
        action = request.form.get("action")
        status_map = {"approve": "approved", "reject": "rejected",
                      "cancel": "canceled", "expire": "expired"}
        if action not in status_map:
            return "Acción inválida", 422
        payment.provider_payload = {"gateway_status": status_map[action]}
        db.session.commit()
        payment_service.update_payment_status(payment, status_map[action])

        front = current_app.config["FRONTEND_URL"]
        if status_map[action] == "approved":
            return redirect(f"{front}/pedido/exitoso?order={payment.order.order_number}&status=approved&ref={reference}")
        if status_map[action] == "rejected":
            return redirect(f"{front}/pedido/error?order={payment.order.order_number}&ref={reference}")
        if status_map[action] == "expired":
            return redirect(f"{front}/pedido/error?order={payment.order.order_number}&ref={reference}")
        return redirect(f"{front}/pedido/cancelado?order={payment.order.order_number}&ref={reference}")

    order = payment.order
    symbol = SettingsService.currency_symbol()
    rows = "".join(
        f"<tr><td>{i.product_name}{('<br><small>' + i.variant_name + '</small>') if i.variant_name else ''}</td>"
        f"<td>{i.quantity}</td><td>{symbol}{float(i.unit_price):,.0f}</td></tr>"
        for i in order.items
    )
    html = f"""
    <!doctype html>
    <html lang="es">
    <head><meta charset="utf-8"><title>Pasarela de prueba</title>
    <style>
      body{{font-family:Arial,Helvetica,sans-serif;background:#f2f2f2;margin:0;display:flex;justify-content:center;padding:40px 16px;}}
      .card{{background:#fff;max-width:520px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.12);}}
      .head{{background:#0e1116;color:#fff;padding:24px 28px;}}
      .head .badge{{display:inline-block;background:#FF5A3C;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:999px;}}
      .body{{padding:24px 28px;}}
      table{{width:100%;border-collapse:collapse;font-size:13px;}}
      td{{padding:8px 4px;border-bottom:1px solid #eee;}}
      .total{{font-weight:bold;font-size:18px;}}
      .methods{{display:flex;gap:8px;margin:16px 0;flex-wrap:wrap;}}
      .methods form{{flex:1;min-width:120px;}}
      button{{width:100%;padding:14px;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;color:#fff;}}
      .ok{{background:#16a34a;}} .bad{{background:#dc2626;}} .neutral{{background:#64748b;}}
      .note{{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;padding:12px;border-radius:8px;font-size:12px;margin-top:16px;}}
    </style></head>
    <body><div class="card">
      <div class="head">
        <span class="badge">ENTORNO DE PRUEBAS</span>
        <h2 style="margin:12px 0 4px;">Pasarela de pagos</h2>
        <div style="opacity:.7;font-size:13px;">Pedido {order.order_number} · {order.currency}</div>
      </div>
      <div class="body">
        <table>
          <tr><td>Cliente</td><td><b>{order.customer_name}</b></td></tr>
          <tr><td>Método</td><td><b>{payment.method or '—'}</b></td></tr>
          {rows}
        </table>
        <div style="text-align:right;margin-top:12px;">Total: <span class="total">{symbol}{float(order.total):,.0f}</span></div>
        <div class="methods">
          <form method="post"><input type="hidden" name="action" value="approve"><button class="ok">Aprobar pago</button></form>
          <form method="post"><input type="hidden" name="action" value="reject"><button class="bad">Rechazar</button></form>
          <form method="post"><input type="hidden" name="action" value="cancel"><button class="neutral">Cancelar</button></form>
        </div>
        <div class="note">Esta es una pasarela simulada para desarrollo. No se procesan pagos reales.
        En producción se configura un proveedor real (Stripe / Mercado Pago) mediante variables de entorno.</div>
      </div>
    </div></body></html>
    """
    return Response(html, mimetype="text/html")
