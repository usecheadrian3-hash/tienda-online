"""
Servicio de correo electrónico configurable (SMTP).

Las credenciales se leen de variables de entorno. Si MAIL_ENABLED=false
el envío se desactiva pero se registra en logs (modo desarrollo).
"""
import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import current_app

from . import receipt_service

logger = logging.getLogger(__name__)


def _send(subject, html, to_email, attachments=None):
    cfg = current_app.config
    if not cfg.get("MAIL_ENABLED"):
        logger.info("[MAIL desactivado] Para: %s | Asunto: %s", to_email, subject)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{cfg.get('MAIL_FROM_NAME', 'Mi Tienda')} <{cfg.get('MAIL_FROM')}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    for name, data, mime_type in (attachments or []):
        part = MIMEApplication(data, _subtype=mime_type.split("/")[-1])
        part.add_header("Content-Disposition", "attachment", filename=name)
        msg.attach(part)

    try:
        server = smtplib.SMTP(cfg.get("MAIL_HOST"), int(cfg.get("MAIL_PORT", 587)))
        if cfg.get("MAIL_USE_TLS"):
            server.starttls()
        if cfg.get("MAIL_USER"):
            server.login(cfg.get("MAIL_USER"), cfg.get("MAIL_PASSWORD"))
        server.sendmail(cfg.get("MAIL_FROM"), [to_email], msg.as_string())
        server.quit()
        return True
    except Exception as exc:
        logger.error("Error enviando correo a %s: %s", to_email, exc)
        return False


def send_order_confirmation(order):
    """Envía comprobante + confirmación al cliente."""
    from .settings_service import SettingsService
    from ..utils.helpers import money

    store = SettingsService.get("store_name", "Tienda")
    receipt_html = receipt_service.render_receipt_html(order)
    pdf = receipt_service.render_receipt_pdf(order)

    subject = f"{store} — Confirmación de compra {order.order_number}"
    link = f"{current_app.config['FRONTEND_URL']}/pedido/{order.order_number}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#FF5A3C;">¡Gracias por tu compra!</h2>
      <p>Hola <b>{order.first_name}</b>, tu pago fue confirmado.</p>
      <p>Pedido: <b>{order.order_number}</b> — Total: <b>{store} · {order.currency}</b></p>
      <p><a href="{link}" style="background:#FF5A3C;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">Ver mi pedido</a></p>
      <hr/>
      {receipt_html}
    </div>
    """
    return _send(
        subject,
        html,
        order.email,
        attachments=[(f"comprobante-{order.order_number}.pdf", pdf, "application/pdf")],
    )
