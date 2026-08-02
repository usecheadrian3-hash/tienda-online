"""
Configuración central de la tienda (branding, moneda, impuestos, envíos, pagos,
redes sociales). Los valores provienen de:
  1. Valores por defecto del código
  2. Variables de entorno (.env)
  3. Tabla `settings` de MySQL (administrables desde /admin)
"""
import json
import threading

from flask import g

from ..models import Setting


DEFAULTS = {
    # Branding
    "store_name": "Tienda",
    "store_tagline": "Productos seleccionados para ti",
    "store_logo": "",
    "store_favicon": "",
    # Moneda
    "currency": "COP",
    "currency_symbol": "$",
    # Impuestos
    "tax_rate": "19",
    "tax_name": "IVA",
    "tax_enabled": "true",
    # Envío
    "free_shipping_threshold": "300000",
    "shipping_methods": json.dumps([
        {"id": "estandar", "name": "Envío estándar", "cost": 10000, "days": "3-5 días", "active": True},
        {"id": "express", "name": "Envío express", "cost": 20000, "days": "1-2 días", "active": True},
        {"id": "gratis", "name": "Envío gratis", "cost": 0, "days": "5-7 días", "active": True,
         "min_subtotal": 300000},
    ]),
    # Contacto
    "support_email": "",
    "support_phone": "",
    "store_address": "",
    "store_city": "",
    # Redes sociales
    "social": json.dumps({
        "facebook": "", "instagram": "", "twitter": "", "tiktok": "", "youtube": "",
    }),
    # Búsqueda / página
    "seo_title": "",
    "seo_description": "",
    "hero_title": "Descubre productos que te encantarán",
    "hero_subtitle": "Explora las últimas tendencias y encuentra productos seleccionados para ti.",
}


class SettingsService:
    _lock = threading.Lock()

    @staticmethod
    def get_all() -> dict:
        """Devuelve settings desde DB (cacheado por request) + defaults."""
        if getattr(g, "_settings", None):
            return g._settings

        db_settings = {}
        try:
            rows = Setting.query.all()
            for row in rows:
                db_settings[row.key] = row.value
        except Exception:
            pass

        merged = dict(DEFAULTS)
        merged.update(db_settings)
        g._settings = merged
        return merged

    @staticmethod
    def get(key, default=None):
        return SettingsService.get_all().get(key, default)

    @staticmethod
    def public() -> dict:
        s = SettingsService.get_all()
        return {
            "store_name": s.get("store_name"),
            "store_tagline": s.get("store_tagline"),
            "store_logo": s.get("store_logo"),
            "currency": s.get("currency"),
            "currency_symbol": s.get("currency_symbol"),
            "tax_rate": float(s.get("tax_rate", 0) or 0),
            "tax_name": s.get("tax_name"),
            "tax_enabled": s.get("tax_enabled") == "true",
            "free_shipping_threshold": float(s.get("free_shipping_threshold", 0) or 0),
            "shipping_methods": SettingsService.shipping_methods(),
            "support_email": s.get("support_email"),
            "support_phone": s.get("support_phone"),
            "store_address": s.get("store_address"),
            "store_city": s.get("store_city"),
            "social": SettingsService.social(),
            "seo_title": s.get("seo_title"),
            "seo_description": s.get("seo_description"),
            "hero_title": s.get("hero_title"),
            "hero_subtitle": s.get("hero_subtitle"),
            "payment_provider": SettingsService.payment_provider_name(),
        }

    @staticmethod
    def shipping_methods() -> list:
        s = SettingsService.get_all()
        try:
            return json.loads(s.get("shipping_methods", "[]"))
        except (TypeError, ValueError):
            return []

    @staticmethod
    def social() -> dict:
        s = SettingsService.get_all()
        try:
            return json.loads(s.get("social", "{}"))
        except (TypeError, ValueError):
            return {}

    @staticmethod
    def payment_provider_name() -> str:
        from flask import current_app
        name = current_app.config.get("PAYMENT_PROVIDER", "test")
        labels = {"test": "Modo de prueba", "stripe": "Stripe", "mercadopago": "Mercado Pago"}
        return labels.get(name, name)

    @staticmethod
    def currency_symbol() -> str:
        return SettingsService.get("currency_symbol", "$")

    @staticmethod
    def format_price(value) -> str:
        sym = SettingsService.currency_symbol()
        currency = SettingsService.get("currency", "COP")
        try:
            v = float(value)
        except (TypeError, ValueError):
            v = 0
        if currency == "COP":
            return f"{sym}{v:,.0f}".replace(",", ".")
        return f"{sym}{v:,.2f}"
