"""Utilidades compartidas de catálogo (listado, filtros, orden)."""
from sqlalchemy import or_

from ..models import Product, Category, Brand
from .helpers import parse_bool


def parse_tags(value):
    if not value:
        return []
    return [v.strip() for v in value.split(",") if v.strip()]


def list_products(args, admin=False, limit=48):
    """Construye una consulta de productos con filtros y orden."""
    query = Product.query

    if not admin:
        query = query.filter(Product.is_active.is_(True))

    # Filtro por categoría (slug o id)
    cat_slug = args.get("category")
    category_id = args.get("category_id")
    if cat_slug:
        cat = Category.query.filter_by(slug=cat_slug).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)
    elif category_id and str(category_id).isdigit():
        query = query.filter(Product.category_id == int(category_id))

    brand_slug = args.get("brand")
    brand_id = args.get("brand_id")
    if brand_slug:
        brand = Brand.query.filter_by(slug=brand_slug).first()
        if brand:
            query = query.filter(Product.brand_id == brand.id)
    elif brand_id and str(brand_id).isdigit():
        query = query.filter(Product.brand_id == int(brand_id))

    if args.get("tag"):
        tag = args["tag"].strip()
        query = query.filter(or_(Product.tags.like(f"%{tag}%"), Product.name.like(f"%{tag}%")))

    if args.get("on_sale") in ("1", "true"):
        query = query.filter(Product.is_on_sale.is_(True))
    if args.get("featured") in ("1", "true"):
        query = query.filter(Product.is_featured.is_(True))
    if args.get("new") in ("1", "true"):
        query = query.filter(Product.is_new.is_(True))
    if args.get("best_seller") in ("1", "true"):
        query = query.filter(Product.is_best_seller.is_(True))

    q = args.get("q") or args.get("search")
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            Product.name.like(like),
            Product.sku.like(like),
            Product.tags.like(like),
            Product.short_description.like(like),
        ))

    price_min = args.get("min_price")
    price_max = args.get("max_price")
    if price_min and str(price_min).replace(".", "", 1).isdigit():
        query = query.filter(Product.price >= float(price_min))
    if price_max and str(price_max).replace(".", "", 1).isdigit():
        query = query.filter(Product.price <= float(price_max))

    sort = args.get("sort", "newest")
    order_by = {
        "newest": Product.created_at.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name_asc": Product.name.asc(),
        "best_sold": Product.sold_count.desc(),
        "rating": Product.rating_avg.desc(),
        "discount": Product.compare_at_price.desc(),
    }
    query = query.order_by(order_by.get(sort, Product.created_at.desc()))

    try:
        page = max(1, int(args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per = min(100, max(1, int(args.get("limit", limit))))
    except (TypeError, ValueError):
        per = limit

    pagination = query.paginate(page=page, per_page=per, error_out=False)
    return pagination, query


def serialize_page(pagination, with_variants=False, with_category=False):
    return {
        "items": [p.serialize(with_variants=with_variants, with_category=with_category) for p in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": pagination.per_page,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }
