"""Datos públicos para la tienda: configuración, homepage, banners, nav."""
from flask import Blueprint

from ..extensions import db
from ..models import Banner, Promotion, Product, Category, Brand, BlogPost, Setting
from ..services.settings_service import SettingsService
from ..utils.helpers import ok
from ..utils.catalog import list_products, serialize_page

bp = Blueprint("pages", __name__, url_prefix="/api")


@bp.get("/config")
def config():
    """Configuración pública de la tienda."""
    data = SettingsService.public()
    data["banners_top"] = [
        b.serialize() for b in Banner.query.filter_by(is_active=True, position="top")
        .order_by(Banner.sort_order.asc()).all()
    ]
    return ok(data)


@bp.get("/home")
def home():
    """Datos del homepage (hero, categorías, marcas, promociones, secciones)."""
    hero_banner = Banner.query.filter_by(is_active=True, position="hero").order_by(Banner.sort_order.asc()).first()
    hero_product = Product.query.filter_by(is_active=True, is_featured=True).order_by(Product.views.desc()).first()

    categories = Category.query.filter_by(is_active=True).order_by(Category.sort_order.asc(), Category.name.asc()).limit(8).all()
    brands = Brand.query.filter_by(is_active=True).order_by(Brand.sort_order.asc(), Brand.name.asc()).limit(12).all()
    promotions = Promotion.query.filter_by(is_active=True).order_by(Promotion.position.asc()).limit(3).all()

    featured_p, _ = list_products({"featured": "true", "limit": "12"})
    best_p, _ = list_products({"best_seller": "true", "limit": "12"})
    new_p, _ = list_products({"new": "true", "limit": "12"})
    sale_p, _ = list_products({"on_sale": "true", "limit": "12"})
    recommended_p, _ = list_products({"limit": "12", "sort": "rating"})
    hero_floating = Product.query.filter_by(is_active=True).order_by(Product.rating_count.desc()).limit(4).all()

    return ok({
        "hero": {
            "title": SettingsService.get("hero_title", "Descubre productos que te encantarán"),
            "subtitle": SettingsService.get("hero_subtitle"),
            "banner": hero_banner.serialize() if hero_banner else None,
            "main_image": hero_product.primary_image if hero_product else None,
            "main_product": hero_product.serialize() if hero_product else None,
            "floating": [p.serialize() for p in hero_floating],
        },
        "categories": [c.serialize() for c in categories],
        "brands": [b.serialize() for b in brands],
        "promotions": [p.serialize() for p in promotions],
        "sections": {
            "featured": serialize_page(featured_p),
            "best_sellers": serialize_page(best_p),
            "new_arrivals": serialize_page(new_p),
            "sales": serialize_page(sale_p),
            "recommended": serialize_page(recommended_p),
        },
    })


@bp.get("/nav")
def nav():
    """Estructura de navegación (categorías con hijos, marcas, páginas)."""
    categories = Category.query.filter_by(is_active=True).order_by(Category.sort_order.asc()).all()
    brands = Brand.query.filter_by(is_active=True).order_by(Brand.sort_order.asc()).limit(8).all()
    return ok({
        "categories": [c.serialize() for c in categories],
        "brands": [b.serialize() for b in brands],
    })


@bp.get("/promotions")
def promotions():
    items = Promotion.query.filter_by(is_active=True).order_by(Promotion.position.asc()).all()
    return ok([p.serialize() for p in items])


@bp.get("/banners")
def banners():
    items = Banner.query.filter_by(is_active=True).order_by(Banner.sort_order.asc()).all()
    return ok([b.serialize() for b in items])
