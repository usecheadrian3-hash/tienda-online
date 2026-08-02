"""Panel administrativo: dashboard, productos, pedidos, clientes, catálogo,
inventario, cupones, pagos, contenido, reseñas, newsletter y configuración."""
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, request, g, send_file
from sqlalchemy import func, or_

from ..extensions import db
from ..models import (
    User, Product, ProductImage, ProductVariant, Category, Brand,
    Order, OrderItem, Payment, Coupon, CouponUsage, Inventory,
    Review, Promotion, Banner, BlogPost, NewsletterSubscriber, Setting,
    Favorite,
)
from ..auth import admin_required
from ..utils.helpers import ok, error, money, parse_bool, slugify
from ..utils.catalog import list_products, serialize_page
from ..services.settings_service import SettingsService
from ..services import receipt_service

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# ============================================================
# DASHBOARD
# ============================================================
@bp.get("/dashboard")
@admin_required
def dashboard():
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    paid_orders = Order.query.filter(Order.payment_status == "approved").all()
    revenue_total = sum(money(o.total) for o in paid_orders)
    revenue_month = sum(money(o.total) for o in paid_orders if (o.paid_at or o.created_at) >= month_start)

    total_orders = Order.query.count()
    orders_paid = Order.query.filter(Order.payment_status == "approved").count()
    conversion = round(orders_paid / total_orders * 100, 1) if total_orders else 0.0
    avg_ticket = revenue_total / orders_paid if orders_paid else 0.0

    customers = User.query.filter(User.role_id == 2).count()
    products = Product.query.count()
    out_of_stock = Product.query.filter(Product.stock <= 0, Product.is_active.is_(True)).count()
    low_stock = Product.query.filter(Product.stock > 0, Product.stock <= Product.stock_min, Product.is_active.is_(True)).count()

    status_counts = dict(db.session.query(Order.status, func.count(Order.id)).group_by(Order.status).all())
    payment_counts = dict(db.session.query(Order.payment_status, func.count(Order.id)).group_by(Order.payment_status).all())

    # Ventas últimos 14 días
    sales_rows = db.session.query(
        func.date(Order.created_at).label("day"),
        func.count(Order.id).label("count"),
        func.sum(Order.total).label("revenue"),
    ).filter(Order.created_at >= (now - timedelta(days=14))).group_by(func.date(Order.created_at)).all()
    sales_map = {str(r.day): {"count": r.count, "revenue": float(r.revenue or 0)} for r in sales_rows}
    sales_chart = []
    for i in range(13, -1, -1):
        d = (now - timedelta(days=i)).date()
        row = sales_map.get(str(d), {"count": 0, "revenue": 0})
        sales_chart.append({"date": d.isoformat(), "count": row["count"], "revenue": row["revenue"]})

    top_products = db.session.query(
        OrderItem.product_id, OrderItem.product_name,
        func.sum(OrderItem.quantity).label("qty"),
        func.sum(OrderItem.subtotal).label("revenue"),
    ).group_by(OrderItem.product_id, OrderItem.product_name) \
        .order_by(func.sum(OrderItem.quantity).desc()).limit(8).all()

    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(8).all()

    return ok({
        "kpis": {
            "revenue_total": round(revenue_total, 2),
            "revenue_month": round(revenue_month, 2),
            "orders_total": total_orders,
            "orders_paid": orders_paid,
            "conversion": conversion,
            "avg_ticket": round(avg_ticket, 2),
            "customers": customers,
            "products": products,
            "out_of_stock": out_of_stock,
            "low_stock": low_stock,
        },
        "status_counts": status_counts,
        "payment_counts": payment_counts,
        "sales_chart": sales_chart,
        "top_products": [
            {"id": r.product_id, "name": r.product_name, "qty": int(r.qty), "revenue": float(r.revenue or 0)}
            for r in top_products
        ],
        "recent_orders": [o.serialize() for o in recent_orders],
        "symbol": SettingsService.currency_symbol(),
        "currency": SettingsService.get("currency", "COP"),
    })


# ============================================================
# PRODUCTOS
# ============================================================
def _build_product(data, product=None):
    errors = {}
    name = (data.get("name") or "").strip()
    sku = (data.get("sku") or "").strip()
    if len(name) < 2:
        errors["name"] = "Nombre requerido"
    if not sku:
        errors["sku"] = "SKU requerido"
    try:
        price = float(data.get("price", 0))
    except (TypeError, ValueError):
        errors["price"] = "Precio inválido"
        price = 0
    if errors:
        return None, errors

    if product is None:
        product = Product()
        db.session.add(product)
    product.name = name
    product.sku = sku
    product.slug = data.get("slug") or slugify(name)
    existing = Product.query.filter(Product.slug == product.slug, Product.id != product.id).first()
    if existing:
        product.slug = f"{product.slug}-{product.id or 'x'}"
    product.category_id = data.get("category_id") or None
    product.brand_id = data.get("brand_id") or None
    product.short_description = (data.get("short_description") or "")[:400] or None
    product.description = data.get("description")
    product.features = data.get("features") if isinstance(data.get("features"), list) else None
    product.price = price
    product.compare_at_price = float(data["compare_at_price"]) if data.get("compare_at_price") else None
    product.cost = float(data.get("cost") or 0)
    product.weight_kg = float(data.get("weight_kg") or 0)
    product.stock = int(data.get("stock", 0) or 0)
    product.stock_min = int(data.get("stock_min", 5) or 5)
    product.is_active = parse_bool(data.get("is_active"), True)
    product.is_featured = parse_bool(data.get("is_featured"), False)
    product.is_new = parse_bool(data.get("is_new"), False)
    product.is_best_seller = parse_bool(data.get("is_best_seller"), False)
    product.is_on_sale = parse_bool(data.get("is_on_sale"), bool(product.compare_at_price and product.compare_at_price > product.price))
    product.tags = ",".join(data.get("tags") or []) if isinstance(data.get("tags"), list) else data.get("tags")
    product.meta_title = data.get("meta_title")
    product.meta_description = data.get("meta_description")

    # Imágenes
    for img in product.images:
        db.session.delete(img)
    images = data.get("images") or []
    for pos, img in enumerate(images):
        url = img.get("url") if isinstance(img, dict) else img
        if not url:
            continue
        db.session.add(ProductImage(
            product=product, url=url,
            alt=img.get("alt") if isinstance(img, dict) else None,
            position=img.get("position", pos) if isinstance(img, dict) else pos,
            is_primary=pos == 0,
        ))

    # Variantes
    for v in product.variants:
        db.session.delete(v)
    variants = data.get("variants") or []
    if variants:
        product.has_variants = True
        for v in variants:
            if not (v.get("sku") or "").strip():
                continue
            db.session.add(ProductVariant(
                product=product,
                sku=(v.get("sku") or "").strip(),
                name=(v.get("name") or "").strip() or "Variante",
                color=v.get("color"),
                size=v.get("size"),
                price=float(v["price"]) if v.get("price") is not None else None,
                compare_at_price=float(v["compare_at_price"]) if v.get("compare_at_price") else None,
                stock=int(v.get("stock", 0) or 0),
                image=v.get("image"),
                is_active=parse_bool(v.get("is_active"), True),
            ))
    else:
        product.has_variants = False

    return product, None


@bp.get("/products")
@admin_required
def admin_products():
    pagination, _ = list_products(request.args, admin=True)
    return ok(serialize_page(pagination, with_variants=True, with_category=True))


@bp.post("/products")
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    product, errors = _build_product(data)
    if errors:
        return error("Corrige los campos", 422, errors)
    db.session.commit()
    return ok(product.serialize(), 201, "Producto creado")


@bp.get("/products/<int:product_id>")
@admin_required
def get_product(product_id):
    product = Product.query.get(product_id)
    if product is None:
        return error("Producto no encontrado", 404)
    return ok(product.serialize(with_variants=True, with_category=True, with_reviews=True))


@bp.put("/products/<int:product_id>")
@admin_required
def update_product(product_id):
    product = Product.query.get(product_id)
    if product is None:
        return error("Producto no encontrado", 404)
    data = request.get_json(silent=True) or {}
    product, errors = _build_product(data, product)
    if errors:
        return error("Corrige los campos", 422, errors)
    db.session.commit()
    return ok(product.serialize(), 200, "Producto actualizado")


@bp.delete("/products/<int:product_id>")
@admin_required
def delete_product(product_id):
    product = Product.query.get(product_id)
    if product is None:
        return error("Producto no encontrado", 404)
    db.session.delete(product)
    db.session.commit()
    return ok(None, 200, "Producto eliminado")


@bp.post("/products/<int:product_id>/toggle")
@admin_required
def toggle_product(product_id):
    product = Product.query.get(product_id)
    if product is None:
        return error("Producto no encontrado", 404)
    product.is_active = not product.is_active
    db.session.commit()
    return ok(product.serialize(), 200, "Producto actualizado")


# ============================================================
# PEDIDOS
# ============================================================
@bp.get("/orders")
@admin_required
def admin_orders():
    query = Order.query
    status = request.args.get("status")
    payment = request.args.get("payment_status")
    q = request.args.get("q")
    if status:
        query = query.filter(Order.status == status)
    if payment:
        query = query.filter(Order.payment_status == payment)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            Order.order_number.like(like), Order.email.like(like),
            Order.first_name.like(like), Order.last_name.like(like),
        ))
    query = query.order_by(Order.created_at.desc())
    page = int(request.args.get("page", 1))
    per = min(int(request.args.get("limit", 20)), 100)
    pagination = query.paginate(page=page, per_page=per, error_out=False)
    data = {
        "items": [o.serialize() for o in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": pagination.per_page,
    }
    data["symbol"] = SettingsService.currency_symbol()
    return ok(data)


@bp.get("/orders/<order_number>")
@admin_required
def admin_order_detail(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    data = order.serialize()
    data["symbol"] = SettingsService.currency_symbol()
    data["tax_name"] = SettingsService.get("tax_name", "Impuesto")
    data["customer_user"] = order.user.serialize() if order.user else None
    return ok(data)


@bp.post("/orders/<order_number>/status")
@admin_required
def admin_order_status(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    data = request.get_json(silent=True) or {}
    status = data.get("status")
    valid = ("pending", "paid", "preparing", "shipped", "delivered", "canceled")
    if status not in valid:
        return error("Estado inválido", 422)
    order.status = status
    db.session.commit()
    order.add_history(status, data.get("note"))
    if status == "shipped":
        shipment = order.shipments[0] if order.shipments else None
        if shipment:
            shipment.status = "shipped"
            shipment.shipped_at = db.func.now()
            if data.get("tracking_code"):
                shipment.tracking_code = data["tracking_code"]
            if data.get("carrier"):
                shipment.carrier = data["carrier"]
        else:
            from ..models import Shipment
            db.session.add(Shipment(order_id=order.id, status="shipped",
                                    tracking_code=data.get("tracking_code"),
                                    carrier=data.get("carrier"),
                                    shipped_at=db.func.now()))
        db.session.commit()
    return ok(order.serialize(), 200, "Estado actualizado")


@bp.post("/orders/<order_number>/shipment")
@admin_required
def admin_order_shipment(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    from ..models import Shipment
    data = request.get_json(silent=True) or {}
    shipment = order.shipments[0] if order.shipments else Shipment(order_id=order.id)
    db.session.add(shipment)
    shipment.tracking_code = data.get("tracking_code") or shipment.tracking_code
    shipment.carrier = data.get("carrier") or shipment.carrier
    db.session.commit()
    return ok(shipment.serialize(), 200, "Envío actualizado")


@bp.get("/orders/<order_number>/receipt.pdf")
@admin_required
def admin_receipt_pdf(order_number):
    order = Order.query.filter_by(order_number=order_number).first()
    if order is None:
        return error("Pedido no encontrado", 404)
    if order.payment_status != "approved":
        return error("El comprobante se genera con pago confirmado", 403)
    import io
    pdf = receipt_service.render_receipt_pdf(order)
    return send_file(io.BytesIO(pdf), mimetype="application/pdf", as_attachment=True,
                     download_name=f"comprobante-{order.order_number}.pdf")


# ============================================================
# CLIENTES
# ============================================================
@bp.get("/customers")
@admin_required
def admin_customers():
    query = User.query.filter(User.role_id == 2)
    q = request.args.get("q")
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.name.like(like), User.email.like(like), User.phone.like(like)))
    query = query.order_by(User.created_at.desc())
    page = int(request.args.get("page", 1))
    per = min(int(request.args.get("limit", 20)), 100)
    pagination = query.paginate(page=page, per_page=per, error_out=False)

    rows = []
    for user in pagination.items:
        orders = Order.query.filter_by(user_id=user.id).all()
        paid = [o for o in orders if o.payment_status == "approved"]
        rows.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "created_at": user.created_at.isoformat() + "Z" if user.created_at else None,
            "orders_count": len(orders),
            "total_spent": round(sum(money(o.total) for o in paid), 2),
            "last_order": orders[0].created_at.isoformat() + "Z" if orders else None,
            "is_active": user.is_active,
        })
    return ok({
        "items": rows,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": pagination.per_page,
    })


@bp.get("/customers/<int:customer_id>")
@admin_required
def admin_customer(customer_id):
    user = User.query.get(customer_id)
    if user is None:
        return error("Cliente no encontrado", 404)
    orders = Order.query.filter_by(user_id=user.id).order_by(Order.created_at.desc()).all()
    favorites = [f.serialize() for f in Favorite.query.filter_by(user_id=user.id).all()]
    return ok({
        "user": user.serialize(),
        "orders": [o.serialize() for o in orders],
        "favorites": favorites,
        "total_spent": round(sum(money(o.total) for o in orders if o.payment_status == "approved"), 2),
    })


@bp.put("/customers/<int:customer_id>/status")
@admin_required
def admin_customer_status(customer_id):
    user = User.query.get(customer_id)
    if user is None:
        return error("Cliente no encontrado", 404)
    data = request.get_json(silent=True) or {}
    if "is_active" in data:
        user.is_active = parse_bool(data["is_active"], True)
    db.session.commit()
    return ok(user.serialize(), 200, "Cliente actualizado")


# ============================================================
# CATEGORÍAS Y MARCAS
# ============================================================
@bp.get("/categories")
@admin_required
def admin_categories():
    items = Category.query.order_by(Category.sort_order.asc(), Category.name.asc()).all()
    return ok([c.serialize() for c in items])


@bp.post("/categories")
@admin_required
def create_category():
    data = request.get_json(silent=True) or {}
    if not (data.get("name") or "").strip():
        return error("Nombre requerido", 422)
    cat = Category(
        name=data["name"].strip(),
        slug=data.get("slug") or slugify(data["name"]),
        description=data.get("description"),
        image=data.get("image"),
        is_active=parse_bool(data.get("is_active"), True),
        sort_order=int(data.get("sort_order", 0) or 0),
        parent_id=data.get("parent_id") or None,
    )
    db.session.add(cat)
    db.session.commit()
    return ok(cat.serialize(), 201, "Categoría creada")


@bp.put("/categories/<int:category_id>")
@admin_required
def update_category(category_id):
    cat = Category.query.get(category_id)
    if cat is None:
        return error("Categoría no encontrada", 404)
    data = request.get_json(silent=True) or {}
    if data.get("name"):
        cat.name = data["name"].strip()
    if data.get("slug"):
        cat.slug = data["slug"].strip()
    for field in ("description", "image"):
        if data.get(field) is not None:
            setattr(cat, field, data[field])
    if "is_active" in data:
        cat.is_active = parse_bool(data["is_active"], True)
    if "sort_order" in data:
        cat.sort_order = int(data["sort_order"] or 0)
    db.session.commit()
    return ok(cat.serialize(), 200, "Categoría actualizada")


@bp.delete("/categories/<int:category_id>")
@admin_required
def delete_category(category_id):
    cat = Category.query.get(category_id)
    if cat is None:
        return error("Categoría no encontrada", 404)
    Product.query.filter_by(category_id=category_id).update({"category_id": None})
    db.session.delete(cat)
    db.session.commit()
    return ok(None, 200, "Categoría eliminada")


@bp.get("/brands")
@admin_required
def admin_brands():
    items = Brand.query.order_by(Brand.sort_order.asc(), Brand.name.asc()).all()
    return ok([b.serialize() for b in items])


@bp.post("/brands")
@admin_required
def create_brand():
    data = request.get_json(silent=True) or {}
    if not (data.get("name") or "").strip():
        return error("Nombre requerido", 422)
    brand = Brand(
        name=data["name"].strip(),
        slug=data.get("slug") or slugify(data["name"]),
        logo=data.get("logo"),
        description=data.get("description"),
        is_active=parse_bool(data.get("is_active"), True),
        sort_order=int(data.get("sort_order", 0) or 0),
    )
    db.session.add(brand)
    db.session.commit()
    return ok(brand.serialize(), 201, "Marca creada")


@bp.put("/brands/<int:brand_id>")
@admin_required
def update_brand(brand_id):
    brand = Brand.query.get(brand_id)
    if brand is None:
        return error("Marca no encontrada", 404)
    data = request.get_json(silent=True) or {}
    if data.get("name"):
        brand.name = data["name"].strip()
    for field in ("slug", "logo", "description"):
        if data.get(field) is not None:
            setattr(brand, field, data[field])
    if "is_active" in data:
        brand.is_active = parse_bool(data["is_active"], True)
    if "sort_order" in data:
        brand.sort_order = int(data["sort_order"] or 0)
    db.session.commit()
    return ok(brand.serialize(), 200, "Marca actualizada")


@bp.delete("/brands/<int:brand_id>")
@admin_required
def delete_brand(brand_id):
    brand = Brand.query.get(brand_id)
    if brand is None:
        return error("Marca no encontrada", 404)
    Product.query.filter_by(brand_id=brand_id).update({"brand_id": None})
    db.session.delete(brand)
    db.session.commit()
    return ok(None, 200, "Marca eliminada")


# ============================================================
# CUPONES
# ============================================================
@bp.get("/coupons")
@admin_required
def admin_coupons():
    items = Coupon.query.order_by(Coupon.created_at.desc()).all()
    return ok([c.serialize() for c in items])


@bp.post("/coupons")
@admin_required
def create_coupon():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip().upper()
    if not code:
        return error("Código requerido", 422)
    if Coupon.query.filter_by(code=code).first():
        return error("Este código ya existe", 409)
    ctype = data.get("type", "percent")
    if ctype not in ("percent", "fixed"):
        return error("Tipo inválido", 422)
    coupon = Coupon(
        code=code,
        type=ctype,
        value=float(data.get("value", 0) or 0),
        starts_at=_parse_dt(data.get("starts_at")),
        ends_at=_parse_dt(data.get("ends_at")),
        max_uses=int(data["max_uses"]) if data.get("max_uses") else None,
        min_subtotal=float(data.get("min_subtotal", 0) or 0),
        is_active=parse_bool(data.get("is_active"), True),
    )
    db.session.add(coupon)
    db.session.commit()
    return ok(coupon.serialize(), 201, "Cupón creado")


@bp.put("/coupons/<int:coupon_id>")
@admin_required
def update_coupon(coupon_id):
    coupon = Coupon.query.get(coupon_id)
    if coupon is None:
        return error("Cupón no encontrado", 404)
    data = request.get_json(silent=True) or {}
    for field in ("value", "max_uses", "min_subtotal"):
        if data.get(field) is not None:
            setattr(coupon, field, float(data[field]))
    if data.get("type") in ("percent", "fixed"):
        coupon.type = data["type"]
    if "is_active" in data:
        coupon.is_active = parse_bool(data["is_active"], True)
    if data.get("starts_at"):
        coupon.starts_at = _parse_dt(data["starts_at"])
    if data.get("ends_at"):
        coupon.ends_at = _parse_dt(data["ends_at"])
    db.session.commit()
    return ok(coupon.serialize(), 200, "Cupón actualizado")


@bp.delete("/coupons/<int:coupon_id>")
@admin_required
def delete_coupon(coupon_id):
    coupon = Coupon.query.get(coupon_id)
    if coupon is None:
        return error("Cupón no encontrado", 404)
    db.session.delete(coupon)
    db.session.commit()
    return ok(None, 200, "Cupón eliminado")


def _parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


# ============================================================
# INVENTARIO
# ============================================================
@bp.get("/inventory")
@admin_required
def admin_inventory():
    products = Product.query.order_by(Product.stock.asc()).all()
    rows = []
    for p in products:
        rows.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "stock": p.stock,
            "stock_min": p.stock_min,
            "status": p.stock_status,
            "sold_count": p.sold_count,
            "variants": len(p.variants),
        })
    return ok(rows)


@bp.post("/inventory/adjust")
@admin_required
def adjust_inventory():
    data = request.get_json(silent=True) or {}
    product = Product.query.get(data.get("product_id"))
    if product is None:
        return error("Producto no encontrado", 404)
    try:
        quantity = int(data.get("quantity", 0))
    except (TypeError, ValueError):
        return error("Cantidad inválida", 422)
    product.stock = max(0, product.stock + quantity)
    db.session.add(Inventory(
        product_id=product.id,
        variant_id=data.get("variant_id"),
        quantity=quantity,
        type=data.get("type", "adjust"),
        note=data.get("note"),
        user_id=g.user.id,
    ))
    db.session.commit()
    return ok({"id": product.id, "stock": product.stock, "status": product.stock_status},
              200, "Inventario actualizado")


# ============================================================
# PAGOS / HISTORIAL
# ============================================================
@bp.get("/payments")
@admin_required
def admin_payments():
    query = Payment.query.order_by(Payment.created_at.desc())
    status = request.args.get("status")
    if status:
        query = query.filter(Payment.status == status)
    page = int(request.args.get("page", 1))
    per = min(int(request.args.get("limit", 20)), 100)
    pagination = query.paginate(page=page, per_page=per, error_out=False)
    return ok({
        "items": [p.serialize() for p in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
    })


@bp.get("/payments/<int:payment_id>")
@admin_required
def admin_payment_detail(payment_id):
    payment = Payment.query.get(payment_id)
    if payment is None:
        return error("Pago no encontrado", 404)
    data = payment.serialize()
    data["payload"] = payment.payload()
    return ok(data)


# ============================================================
# CONTENIDO (promociones, banners, blog, newsletter)
# ============================================================
@bp.route("/promotions", methods=["GET", "POST"])
@admin_required
def promotions():
    if request.method == "GET":
        items = Promotion.query.order_by(Promotion.position.asc()).all()
        return ok([p.serialize() for p in items])
    data = request.get_json(silent=True) or {}
    if not (data.get("title") or "").strip():
        return error("Título requerido", 422)
    promo = Promotion(
        title=data["title"].strip(),
        subtitle=data.get("subtitle"),
        image=data.get("image"),
        link=data.get("link"),
        badge=data.get("badge"),
        discount_percent=int(data["discount_percent"]) if data.get("discount_percent") else None,
        expires_at=_parse_dt(data.get("expires_at")),
        is_active=parse_bool(data.get("is_active"), True),
        position=int(data.get("position", 0) or 0),
    )
    db.session.add(promo)
    db.session.commit()
    return ok(promo.serialize(), 201, "Promoción creada")


@bp.route("/promotions/<int:promo_id>", methods=["PUT", "DELETE"])
@admin_required
def promotion(promo_id):
    promo = Promotion.query.get(promo_id)
    if promo is None:
        return error("Promoción no encontrada", 404)
    if request.method == "DELETE":
        db.session.delete(promo)
        db.session.commit()
        return ok(None, 200, "Promoción eliminada")
    data = request.get_json(silent=True) or {}
    for field in ("title", "subtitle", "image", "link", "badge"):
        if data.get(field) is not None:
            setattr(promo, field, data[field])
    if "is_active" in data:
        promo.is_active = parse_bool(data["is_active"], True)
    if "position" in data:
        promo.position = int(data["position"] or 0)
    if data.get("discount_percent"):
        promo.discount_percent = int(data["discount_percent"])
    if data.get("expires_at"):
        promo.expires_at = _parse_dt(data["expires_at"])
    db.session.commit()
    return ok(promo.serialize(), 200, "Promoción actualizada")


@bp.route("/banners", methods=["GET", "POST"])
@admin_required
def banners():
    if request.method == "GET":
        items = Banner.query.order_by(Banner.position.asc(), Banner.sort_order.asc()).all()
        return ok([b.serialize() for b in items])
    data = request.get_json(silent=True) or {}
    if not (data.get("text") or "").strip():
        return error("Texto requerido", 422)
    banner = Banner(
        text=data["text"].strip(),
        link=data.get("link"),
        position=data.get("position", "top") if data.get("position") in ("top", "hero", "middle") else "top",
        is_active=parse_bool(data.get("is_active"), True),
        sort_order=int(data.get("sort_order", 0) or 0),
    )
    db.session.add(banner)
    db.session.commit()
    return ok(banner.serialize(), 201, "Banner creado")


@bp.route("/banners/<int:banner_id>", methods=["PUT", "DELETE"])
@admin_required
def banner(banner_id):
    banner = Banner.query.get(banner_id)
    if banner is None:
        return error("Banner no encontrado", 404)
    if request.method == "DELETE":
        db.session.delete(banner)
        db.session.commit()
        return ok(None, 200, "Banner eliminado")
    data = request.get_json(silent=True) or {}
    for field in ("text", "link"):
        if data.get(field) is not None:
            setattr(banner, field, data[field])
    if data.get("position") in ("top", "hero", "middle"):
        banner.position = data["position"]
    if "is_active" in data:
        banner.is_active = parse_bool(data["is_active"], True)
    if "sort_order" in data:
        banner.sort_order = int(data["sort_order"] or 0)
    db.session.commit()
    return ok(banner.serialize(), 200, "Banner actualizado")


@bp.route("/blog", methods=["GET", "POST"])
@admin_required
def admin_blog():
    if request.method == "GET":
        items = BlogPost.query.order_by(BlogPost.created_at.desc()).all()
        return ok([p.serialize() for p in items])
    data = request.get_json(silent=True) or {}
    if not (data.get("title") or "").strip():
        return error("Título requerido", 422)
    post = BlogPost(
        title=data["title"].strip(),
        slug=data.get("slug") or slugify(data["title"]),
        excerpt=data.get("excerpt"),
        content=data.get("content"),
        cover_image=data.get("cover_image"),
        category=data.get("category"),
        tags=",".join(data.get("tags") or []) if isinstance(data.get("tags"), list) else data.get("tags"),
        status=data.get("status", "draft") if data.get("status") in ("draft", "published") else "draft",
        published_at=db.func.now() if data.get("status") == "published" else None,
        author_id=g.user.id,
    )
    db.session.add(post)
    db.session.commit()
    return ok(post.serialize(), 201, "Artículo creado")


@bp.route("/blog/<int:post_id>", methods=["PUT", "DELETE"])
@admin_required
def admin_blog_post(post_id):
    post = BlogPost.query.get(post_id)
    if post is None:
        return error("Artículo no encontrado", 404)
    if request.method == "DELETE":
        db.session.delete(post)
        db.session.commit()
        return ok(None, 200, "Artículo eliminado")
    data = request.get_json(silent=True) or {}
    for field in ("title", "excerpt", "content", "cover_image", "category"):
        if data.get(field) is not None:
            setattr(post, field, data[field])
    if data.get("slug"):
        post.slug = data["slug"].strip()
    if data.get("tags") is not None:
        post.tags = ",".join(data["tags"]) if isinstance(data["tags"], list) else data["tags"]
    if data.get("status") in ("draft", "published"):
        post.status = data["status"]
        if data["status"] == "published" and not post.published_at:
            post.published_at = db.func.now()
    db.session.commit()
    return ok(post.serialize(), 200, "Artículo actualizado")


@bp.get("/newsletter")
@admin_required
def newsletter():
    items = NewsletterSubscriber.query.order_by(NewsletterSubscriber.created_at.desc()).all()
    return ok([s.serialize() for s in items])


@bp.delete("/newsletter/<int:sub_id>")
@admin_required
def newsletter_delete(sub_id):
    sub = NewsletterSubscriber.query.get(sub_id)
    if sub is None:
        return error("Suscripción no encontrada", 404)
    db.session.delete(sub)
    db.session.commit()
    return ok(None, 200, "Suscripción eliminada")


# ============================================================
# RESEÑAS
# ============================================================
@bp.get("/reviews")
@admin_required
def admin_reviews():
    query = Review.query.order_by(Review.created_at.desc())
    status = request.args.get("status")
    if status in ("approved", "pending"):
        query = query.filter(Review.is_approved == (status == "approved"))
    items = query.limit(100).all()
    return ok([r.serialize() for r in items])


@bp.put("/reviews/<int:review_id>")
@admin_required
def admin_review_update(review_id):
    review = Review.query.get(review_id)
    if review is None:
        return error("Reseña no encontrada", 404)
    data = request.get_json(silent=True) or {}
    if "is_approved" in data:
        review.is_approved = parse_bool(data["is_approved"], True)
    if data.get("rating"):
        review.rating = max(1, min(5, int(data["rating"])))
    db.session.commit()
    if review.product:
        review.product.update_rating()
        db.session.commit()
    return ok(review.serialize(), 200, "Reseña actualizada")


@bp.delete("/reviews/<int:review_id>")
@admin_required
def admin_review_delete(review_id):
    review = Review.query.get(review_id)
    if review is None:
        return error("Reseña no encontrada", 404)
    db.session.delete(review)
    db.session.commit()
    return ok(None, 200, "Reseña eliminada")


# ============================================================
# CONFIGURACIÓN DE LA TIENDA
# ============================================================
@bp.get("/settings")
@admin_required
def admin_settings():
    rows = Setting.query.all()
    values = {r.key: r.value for r in rows}
    return ok(values)


@bp.put("/settings")
@admin_required
def update_settings():
    data = request.get_json(silent=True) or {}
    for key, value in data.items():
        if key in ("shipping_methods", "social"):
            if isinstance(value, (list, dict)):
                import json as _json
                value = _json.dumps(value)
            elif isinstance(value, str):
                try:
                    _json.loads(value)
                except (TypeError, ValueError):
                    value = _json.dumps(value)
        setting = Setting.query.filter_by(key=key).first()
        if setting is None:
            setting = Setting(key=key, value=str(value))
            db.session.add(setting)
        else:
            setting.value = str(value)
    db.session.commit()
    return ok(SettingsService.get_all(), 200, "Configuración guardada")
