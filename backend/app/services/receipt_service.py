"""
Servicio de comprobantes / recibos.

Genera el comprobante digital (HTML) y el PDF profesional (reportlab)
SOLO cuando el pago fue confirmado por el backend.
"""
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage,
)
from reportlab.lib.enums import TA_RIGHT

from .settings_service import SettingsService


def _fmt(value, symbol=None):
    if symbol is None:
        symbol = SettingsService.currency_symbol()
    try:
        return f"{symbol}{float(value):,.0f}".replace(",", ".")
    except (TypeError, ValueError):
        return f"{symbol}0"


def _fmt_date(value):
    if not value:
        return ""
    return value.strftime("%d/%m/%Y %H:%M") if hasattr(value, "strftime") else str(value)


def render_receipt_html(order) -> str:
    """Comprobante en HTML (correo + previsualización)."""
    s = SettingsService.get_all()
    store = s.get("store_name", "Tienda")
    symbol = SettingsService.currency_symbol()
    lines = []
    for item in order.items:
        lines.append(
            f"<tr>"
            f"<td>{item.product_name}{'<br><small>' + item.variant_name + '</small>' if item.variant_name else ''}</td>"
            f"<td>{item.sku or '-'}</td>"
            f"<td>{item.quantity}</td>"
            f"<td>{_fmt(item.unit_price, symbol)}</td>"
            f"<td>{_fmt(item.subtotal, symbol)}</td>"
            f"</tr>"
        )
    items_html = "".join(lines)
    tax_line = ""
    if float(order.tax_amount or 0) > 0:
        tax_line = (
            f"<tr><td colspan='3'></td><td>{s.get('tax_name', 'Impuesto')} ({float(s.get('tax_rate', 0)):g}%)</td>"
            f"<td>{_fmt(order.tax_amount, symbol)}</td></tr>"
        )
    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;color:#1a1a1a;border:1px solid #eee;">
      <div style="background:#0e1116;color:#fff;padding:24px 32px;">
        <div style="font-size:20px;font-weight:bold;">{store}</div>
        <div style="font-size:12px;opacity:.8;">{s.get('store_tagline','')}</div>
      </div>
      <div style="padding:32px;">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:16px;">
          <div>
            <div style="font-size:13px;color:#888;">Comprobante de compra</div>
            <div style="font-size:22px;font-weight:bold;">{order.order_number}</div>
            <div style="font-size:12px;color:#666;">Fecha: {_fmt_date(order.created_at)}</div>
            <div style="font-size:12px;color:#666;">Pago: <b>{order.payment_method or '—'}</b></div>
          </div>
          <div style="text-align:right;font-size:12px;color:#666;">
            <div><b>Estado del pago: PAGADO</b></div>
            <div>Transacción: {order.payment_transaction or '—'}</div>
          </div>
        </div>
        <table style="width:100%;font-size:13px;margin:16px 0;">
          <tr>
            <td style="padding:8px 0;"><b>Cliente</b><br>{order.customer_name}<br>{order.email}<br>{order.phone or ''}</td>
            <td style="padding:8px 0;"><b>Envío</b><br>{order.shipping_method or '—'}<br>{order.address or ''}<br>{order.city or ''} {order.state or ''} {order.postal_code or ''}<br>{order.country or ''}</td>
          </tr>
        </table>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <thead><tr style="background:#f6f6f6;">
            <th style="padding:10px;text-align:left;">Producto</th>
            <th style="padding:10px;text-align:left;">SKU</th>
            <th style="padding:10px;">Cant.</th>
            <th style="padding:10px;">Precio</th>
            <th style="padding:10px;">Subtotal</th>
          </tr></thead>
          <tbody>{items_html}</tbody>
        </table>
        <table style="width:300px;margin-left:auto;font-size:13px;margin-top:16px;">
          <tr><td>Subtotal</td><td style="text-align:right;">{_fmt(order.subtotal, symbol)}</td></tr>
          <tr><td>Descuento</td><td style="text-align:right;">-{_fmt(order.discount, symbol)}</td></tr>
          <tr><td>Envío</td><td style="text-align:right;">{_fmt(order.shipping_cost, symbol)}</td></tr>
          {tax_line}
          <tr><td style="font-weight:bold;border-top:2px solid #000;">TOTAL</td><td style="text-align:right;font-weight:bold;border-top:2px solid #000;">{_fmt(order.total, symbol)}</td></tr>
        </table>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#888;">
          {s.get('store_address','')} · {s.get('support_phone','')} · {s.get('support_email','')}
        </div>
      </div>
    </div>
    """


def render_receipt_pdf(order) -> bytes:
    """PDF profesional con reportlab."""
    s = SettingsService.get_all()
    symbol = SettingsService.currency_symbol()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
    )

    accent = colors.HexColor("#FF5A3C")
    dark = colors.HexColor("#0E1116")
    light = colors.HexColor("#666666")

    styles = {
        "store": ParagraphStyle("store", fontName="Helvetica-Bold", fontSize=18, textColor=colors.white),
        "tagline": ParagraphStyle("tagline", fontName="Helvetica", fontSize=9, textColor=colors.HexColor("#cccccc")),
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=13, textColor=dark),
        "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=9, textColor=accent),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, textColor=light),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9, textColor=dark),
        "bodyb": ParagraphStyle("bodyb", fontName="Helvetica-Bold", fontSize=9, textColor=dark),
        "right": ParagraphStyle("right", fontName="Helvetica", fontSize=9, textColor=dark, alignment=TA_RIGHT),
    }

    story = []
    # Encabezado oscuro
    head = Table(
        [[Paragraph(s.get("store_name", "Tienda"), styles["store"]), Paragraph("COMPROBANTE DE COMPRA", styles["title"])]],
        colWidths=[doc.width * 0.7, doc.width * 0.3],
    )
    head.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), dark),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(head)
    story.append(Spacer(1, 8))
    story.append(Paragraph(s.get("store_tagline", "") or " ", styles["small"]))

    story.append(Spacer(1, 12))
    info = [
        [Paragraph("<b>PEDIDO</b>", styles["h2"]), Paragraph("<b>CLIENTE</b>", styles["h2"]), Paragraph("<b>PAGO</b>", styles["h2"])],
        [Paragraph(order.order_number, styles["bodyb"]),
         Paragraph(f"{order.customer_name}<br/>{order.email}<br/>{order.phone or ''}", styles["body"]),
         Paragraph(f"{order.payment_method or '—'}<br/>ESTADO: PAGADO<br/>Ref: {order.payment_transaction or '—'}", styles["body"])],
        [Paragraph(f"Fecha: {_fmt_date(order.created_at)}", styles["small"]),
         Paragraph(f"{order.address or ''}, {order.city or ''} {order.state or ''} {order.postal_code or ''}", styles["small"]),
         Paragraph(f"Envío: {order.shipping_method or '—'}", styles["small"])],
    ]
    t = Table(info, colWidths=[doc.width * 0.3, doc.width * 0.35, doc.width * 0.35])
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # Items
    story.append(Paragraph("DETALLE DE PRODUCTOS", styles["h2"]))
    story.append(Spacer(1, 4))
    header = [
        Paragraph("Producto", styles["bodyb"]), Paragraph("SKU", styles["bodyb"]),
        Paragraph("Cant.", styles["bodyb"]), Paragraph("Precio", styles["right"]),
        Paragraph("Subtotal", styles["right"]),
    ]
    rows = [header]
    for item in order.items:
        name = item.product_name + (f"<br/><small>{item.variant_name}</small>" if item.variant_name else "")
        rows.append([
            Paragraph(name, styles["body"]), Paragraph(item.sku or "-", styles["small"]),
            Paragraph(str(item.quantity), styles["body"]),
            Paragraph(_fmt(item.unit_price, symbol), styles["right"]),
            Paragraph(_fmt(item.subtotal, symbol), styles["right"]),
        ])
    items_tbl = Table(rows, colWidths=[doc.width * 0.4, doc.width * 0.2, doc.width * 0.1, doc.width * 0.15, doc.width * 0.15])
    items_tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#eeeeee")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f6f6f6")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(items_tbl)
    story.append(Spacer(1, 12))

    # Totales
    totals_rows = [
        [Paragraph("Subtotal", styles["body"]), Paragraph(_fmt(order.subtotal, symbol), styles["right"])],
        [Paragraph("Descuento", styles["body"]), Paragraph(f"-{_fmt(order.discount, symbol)}", styles["right"])],
        [Paragraph("Envío", styles["body"]), Paragraph(_fmt(order.shipping_cost, symbol), styles["right"])],
    ]
    if float(order.tax_amount or 0) > 0:
        totals_rows.append([
            Paragraph(f"{s.get('tax_name', 'Impuesto')}", styles["body"]),
            Paragraph(_fmt(order.tax_amount, symbol), styles["right"]),
        ])
    totals_rows.append([
        Paragraph("TOTAL", styles["bodyb"]), Paragraph(_fmt(order.total, symbol), styles["right"]),
    ])
    totals_tbl = Table(totals_rows, colWidths=[doc.width * 0.7, doc.width * 0.3])
    totals_tbl.setStyle(TableStyle([
        ("LINEABOVE", (0, -1), (-1, -1), 1.2, accent),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(totals_tbl)
    story.append(Spacer(1, 20))

    story.append(Paragraph(
        f"{s.get('store_address', '')} · {s.get('support_phone', '')} · {s.get('support_email', '')}",
        styles["small"],
    ))
    story.append(Paragraph("Gracias por tu compra.", styles["small"]))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
