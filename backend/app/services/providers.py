"""
Proveedores de pago modulares.

Cada proveedor implementa la misma interfaz:
    create_payment(payment, order, method, return_urls) -> dict
    verify(payment) -> dict(status, ...)
    handle_webhook(payload, headers) -> dict

Los datos sensibles (API keys) se leen SIEMPRE de la configuración del
servidor (variables de entorno). Nunca desde el frontend.
"""
import hashlib
import hmac
import json
import time
import uuid

import requests
from flask import current_app, url_for


class PaymentProviderError(Exception):
    pass


class BaseProvider:
    name = "base"

    def __init__(self, app=None):
        if app:
            self.init_app(app)

    def init_app(self, app):
        self.app = app
        self.config = app.config

    def create_payment(self, payment, order, method, return_urls):
        raise NotImplementedError

    def verify(self, payment):
        raise NotImplementedError

    def handle_webhook(self, payload, headers):
        raise NotImplementedError

    def redirect_url(self, payment):
        return f"{self.config['BACKEND_URL']}/api/payments/{self.name}/gateway/{payment.reference}"


class TestProvider(BaseProvider):
    """
    Proveedor de prueba: simula el entorno seguro de una pasarela.
    NO se usa en producción. Permite probar todo el flujo de compra
    (aprobación, rechazo, cancelación, expiración y webhooks).
    """
    name = "test"

    def create_payment(self, payment, order, method, return_urls):
        return {
            "payment_url": self.redirect_url(payment),
            "transaction_id": payment.transaction_id,
            "reference": payment.reference,
            "status": "pending",
        }

    def verify(self, payment):
        status = (payment.provider_payload or {}).get("gateway_status", payment.status)
        return {"status": status, "approved": status == "approved"}

    def handle_webhook(self, payload, headers):
        # En modo test el webhook emula la confirmación de la pasarela.
        return payload


class StripeProvider(BaseProvider):
    """
    Integración con Stripe Checkout (tarjetas y demás métodos
    habilitados en la cuenta Stripe). Configurar en .env:
        STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CURRENCY
    """
    name = "stripe"
    api = "https://api.stripe.com/v1"

    @property
    def secret(self):
        key = self.config.get("STRIPE_SECRET_KEY")
        if not key:
            raise PaymentProviderError("Stripe no configurado: falta STRIPE_SECRET_KEY")
        return key

    def create_payment(self, payment, order, method, return_urls):
        items = []
        for item in order.items:
            items.append({
                "quantity": item.quantity,
                "price_data": {
                    "currency": order.currency.lower(),
                    "unit_amount": int(round(float(item.unit_price) * 100)),
                    "product_data": {
                        "name": item.product_name,
                        "description": item.variant_name or "",
                    },
                },
            })
        data = {
            "mode": "payment",
            "client_reference_id": str(order.id),
            "success_url": return_urls.get("success"),
            "cancel_url": return_urls.get("cancel"),
            "line_items": json.dumps(items) if False else None,
        }
        # Stripe requiere line_items como lista de objetos form-urlencoded
        body = {
            "mode": "payment",
            "client_reference_id": str(order.id),
            "success_url": return_urls.get("success"),
            "cancel_url": return_urls.get("cancel"),
        }
        for idx, item in enumerate(items):
            base = f"line_items[{idx}]"
            body[f"{base}[quantity]"] = str(item["quantity"])
            body[f"{base}[price_data][currency]"] = item["price_data"]["currency"]
            body[f"{base}[price_data][unit_amount]"] = str(item["price_data"]["unit_amount"])
            body[f"{base}[price_data][product_data][name]"] = item["price_data"]["product_data"]["name"]
            if item["price_data"]["product_data"].get("description"):
                body[f"{base}[price_data][product_data][description]"] = item["price_data"]["product_data"]["description"]

        resp = requests.post(
            f"{self.api}/checkout/sessions",
            auth=(self.secret, ""),
            data=body,
            timeout=30,
        )
        if resp.status_code != 200:
            raise PaymentProviderError(f"Stripe error: {resp.text[:300]}")
        session = resp.json()
        payment.transaction_id = session.get("id")
        payment.reference = session.get("payment_intent") or session.get("id")
        return {
            "payment_url": session.get("url"),
            "transaction_id": session.get("id"),
            "reference": payment.reference,
            "status": "processing",
        }

    def verify(self, payment):
        txn = payment.transaction_id
        if not txn:
            return {"status": payment.status, "approved": False}
        try:
            resp = requests.get(
                f"{self.api}/checkout/sessions/{txn}",
                auth=(self.secret, ""),
                timeout=30,
            )
            session = resp.json()
            mapped = {"complete": "approved", "open": "processing",
                      "expired": "expired", "unpaid": "pending"}.get(
                          session.get("payment_status", ""), "pending")
            return {"status": mapped, "approved": mapped == "approved",
                    "transaction_id": session.get("payment_intent") or txn}
        except Exception as exc:  # pragma: no cover
            return {"status": payment.status, "approved": False, "error": str(exc)}

    def handle_webhook(self, payload, headers):
        secret = self.config.get("STRIPE_WEBHOOK_SECRET")
        body = request_body()
        sig_header = headers.get("Stripe-Signature", "")
        if secret:
            try:
                # signature: t=timestamp,v1=hash
                parts = dict(p.split("=", 1) for p in sig_header.split(","))
                signed = f"{parts['t']}.{body}"
                expected = hmac.new(secret.encode(), signed.encode(), hashlib.sha256).hexdigest()
                if not hmac.compare_digest(expected, parts.get("v1", "")):
                    raise PaymentProviderError("Firma inválida de webhook Stripe")
            except (KeyError, TypeError) as exc:
                raise PaymentProviderError(f"Webhook Stripe inválido: {exc}")
        event = payload.get("type", "")
        return {
            "event": event,
            "session": payload.get("data", {}).get("object", {}),
            "approved": event in ("checkout.session.completed", "payment_intent.succeeded"),
            "reference": payload.get("data", {}).get("object", {}).get("client_reference_id"),
        }


class MercadoPagoProvider(BaseProvider):
    """
    Integración con Mercado Pago (Colombia): PSE, Bancolombia,
    tarjetas débito/crédito y otros métodos disponibles en la cuenta.
    Configurar en .env: MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_PUBLIC_KEY.
    """
    name = "mercadopago"
    api = "https://api.mercadopago.com"

    @property
    def token(self):
        token = self.config.get("MERCADOPAGO_ACCESS_TOKEN")
        if not token:
            raise PaymentProviderError("Mercado Pago no configurado: falta MERCADOPAGO_ACCESS_TOKEN")
        return token

    def create_payment(self, payment, order, method, return_urls):
        method_map = {
            "pse": "pse",
            "bancolombia": "bank_transfer",
            "card": "credit_card",
        }
        payment_method_id = method_map.get((method or "").lower())
        body = {
            "items": [
                {
                    "id": str(item.product_id or item.id),
                    "title": item.product_name,
                    "quantity": int(item.quantity),
                    "unit_price": float(item.unit_price),
                    "currency_id": "COP",
                }
                for item in order.items
            ],
            "payer": {
                "email": order.email,
                "name": order.first_name,
                "surname": order.last_name,
                "phone": {"number": order.phone or ""},
            },
            "external_reference": order.order_number,
            "back_urls": {
                "success": return_urls.get("success"),
                "pending": return_urls.get("pending"),
                "failure": return_urls.get("failure"),
            },
            "auto_return": "approved",
            "notification_url": return_urls.get("webhook"),
        }
        headers = {"Authorization": f"Bearer {self.token}"}

        if payment_method_id == "pse":
            body["payment_method_id"] = "pse"
            body["transaction_amount"] = float(order.total)
            body["description"] = f"Compra {order.order_number}"
            resp = requests.post(f"{self.api}/v1/payments", json=body, headers=headers, timeout=30)
            if resp.status_code not in (200, 201):
                raise PaymentProviderError(f"Mercado Pago error: {resp.text[:300]}")
            payment_data = resp.json()
            payment.transaction_id = str(payment_data.get("id"))
            return {
                "payment_url": payment_data.get("point_of_interaction", {}).get("transaction_data", {}).get("ticket_url"),
                "transaction_id": str(payment_data.get("id")),
                "status": payment_data.get("status", "pending"),
            }

        # Checkout Pro (preferencia)
        pref_body = {
            "items": body["items"],
            "payer": body["payer"],
            "external_reference": body["external_reference"],
            "back_urls": body["back_urls"],
            "auto_return": "approved",
            "notification_url": body["notification_url"],
            "payment_methods": {"installments": 12},
        }
        resp = requests.post(f"{self.api}/checkout/preferences", json=pref_body, headers=headers, timeout=30)
        if resp.status_code not in (200, 201):
            raise PaymentProviderError(f"Mercado Pago error: {resp.text[:300]}")
        pref = resp.json()
        payment.transaction_id = pref.get("id")
        return {
            "payment_url": pref.get("init_point"),
            "transaction_id": pref.get("id"),
            "status": "processing",
        }

    def verify(self, payment):
        txn = payment.transaction_id
        if not txn:
            return {"status": payment.status, "approved": False}
        try:
            resp = requests.get(
                f"{self.api}/v1/payments/{txn}",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30,
            )
            data = resp.json()
            mapped = {
                "approved": "approved", "pending": "pending", "in_process": "processing",
                "rejected": "rejected", "cancelled": "canceled", "expired": "expired",
            }.get(data.get("status", ""), "pending")
            return {"status": mapped, "approved": mapped == "approved",
                    "transaction_id": txn, "raw_status": data.get("status_detail")}
        except Exception as exc:  # pragma: no cover
            return {"status": payment.status, "approved": False, "error": str(exc)}

    def handle_webhook(self, payload, headers):
        # Mercado Pago envía: {"type":"payment","data":{"id":"..."}}
        try:
            return {
                "event": payload.get("type", ""),
                "payment_id": payload.get("data", {}).get("id"),
                "approved": False,
            }
        except Exception:
            return payload


def request_body():
    from flask import request
    return request.get_data(as_text=True)


def get_provider(app=None):
    from flask import current_app
    app = app or current_app
    name = app.config.get("PAYMENT_PROVIDER", "test")
    providers = {
        "test": TestProvider,
        "stripe": StripeProvider,
        "mercadopago": MercadoPagoProvider,
    }
    cls = providers.get(name, TestProvider)
    return cls(app)
