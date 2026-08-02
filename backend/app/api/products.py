"""API de productos, categorías, marcas y búsqueda."""
from flask import Blueprint, request

from ..extensions import db
from ..models import Product, Category, Brand, Review
from ..utils.helpers import ok, error
from ..utils.catalog import list_products, serialize_page

bp = Blueprint("products", __name__, url_prefix="/api")


@bp.get("/products")
def products():
    pagination, _ = list_products(request.args)
    data = serialize_page(pagination, with_category=True)
    return ok(data)


@bp.get("/products/featured")
def featured():
    pagination, _ = list_products({**request.args, "featured": "true"})
    return ok(serialize_page(pagination))


@bp.get("/products/sales")
def sales():
    pagination, _ = list_products({**request.args, "on_sale": "true"})
    return ok(serialize_page(pagination))


@bp.get("/products/new")
def new_products():
    pagination, _ = list_products({**request.args, "new": "true"})
    return ok(serialize_page(pagination))


@bp.get("/products/best-sellers")
def best_sellers():
    pagination, _ = list_products({**request.args, "best_seller": "true"})
    return ok(serialize_page(pagination))


@bp.get("/products/<slug>")
def product_detail(slug):
    product = Product.query.filter_by(slug=slug).first()
    if product is None or not product.is_active:
        product = Product.query.get(int(slug)) if slug.isdigit() else None
        if product is None or not product.is_active:
            return error("Producto no encontrado", 404)
    product.views = (product.views or 0) + 1
    db.session.commit()
    related = Product.query.filter(
        Product.category_id == product.category_id,
        Product.id != product.id,
        Product.is_active.is_(True),
    ).limit(8).all()
    data = product.serialize(with_reviews=True, with_category=True)
    data["related"] = [p.serialize() for p in related]
    return ok(data)


@bp.get("/categories")
def categories():
    items = Category.query.filter_by(is_active=True).order_by(Category.sort_order.asc(), Category.name.asc()).all()
    return ok([c.serialize() for c in items])


@bp.get("/categories/<slug>")
def category_detail(slug):
    category = Category.query.filter_by(slug=slug).first()
    if category is None or not category.is_active:
        return error("Categoría no encontrada", 404)
    pagination, _ = list_products({**request.args, "category": slug})
    data = serialize_page(pagination, with_category=True)
    data["category"] = category.serialize()
    return ok(data)


@bp.get("/brands")
def brands():
    items = Brand.query.filter_by(is_active=True).order_by(Brand.sort_order.asc(), Brand.name.asc()).all()
    return ok([b.serialize() for b in items])


@bp.get("/brands/<slug>")
def brand_detail(slug):
    brand = Brand.query.filter_by(slug=slug).first()
    if brand is None or not brand.is_active:
        return error("Marca no encontrada", 404)
    pagination, _ = list_products({**request.args, "brand": slug})
    data = serialize_page(pagination, with_category=True)
    data["brand"] = brand.serialize()
    return ok(data)


@bp.get("/search")
def search():
    """Búsqueda en tiempo real (productos, categorías, marcas)."""
    q = (request.args.get("q") or "").strip()
    limit = min(int(request.args.get("limit", 8)), 20)
    if len(q) < 2:
        return ok({"products": [], "categories": [], "brands": []})

    like = f"%{q}%"
    products = Product.query.filter(
        Product.is_active.is_(True),
        (Product.name.like(like) | Product.tags.like(like) | Product.sku.like(like))
    ).order_by(Product.rating_count.desc()).limit(limit).all()

    categories = Category.query.filter(
        Category.is_active.is_(True),
        Category.name.like(like)
    ).limit(4).all()

    brands = Brand.query.filter(
        Brand.is_active.is_(True),
        Brand.name.like(like)
    ).limit(4).all()

    return ok({
        "products": [p.serialize() for p in products],
        "categories": [c.serialize() for c in categories],
        "brands": [b.serialize() for b in brands],
    })
