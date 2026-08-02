"""Cupones, newsletter, reseñas y blog."""
from flask import Blueprint, request, g

from ..extensions import db
from ..models import Coupon, NewsletterSubscriber, Review, Product, Order, OrderItem, User
from ..auth import login_required, optional_auth
from ..utils.helpers import ok, error

bp = Blueprint("extras", __name__, url_prefix="/api")


@bp.post("/coupons/validate")
def validate_coupon():
    data = request.get_json(silent=True) or {}
    code = (data.get("code") or "").strip().upper()
    subtotal = float(data.get("subtotal") or 0)
    coupon = Coupon.query.filter_by(code=code).first()
    if coupon is None:
        return error("Cupón no válido", 404)
    valid, msg = coupon.is_valid(subtotal)
    if not valid:
        return error(msg or "Cupón no válido", 422)
    return ok({
        "code": coupon.code,
        "type": coupon.type,
        "value": float(coupon.value),
        "discount": coupon.discount_for(subtotal),
    }, 200, f"Cupón {code} aplicado")


@bp.post("/newsletter")
def subscribe_newsletter():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        return error("Email inválido", 422)
    sub = NewsletterSubscriber.query.filter_by(email=email).first()
    if sub:
        if not sub.is_active:
            sub.is_active = True
            db.session.commit()
        return ok(None, 200, "Ya estabas suscrito")
    db.session.add(NewsletterSubscriber(email=email))
    db.session.commit()
    return ok(None, 201, "Suscripción exitosa")


@bp.get("/reviews")
def product_reviews():
    product_id = request.args.get("product_id")
    if not product_id:
        return error("product_id requerido", 422)
    reviews = Review.query.filter_by(product_id=int(product_id), is_approved=True) \
        .order_by(Review.created_at.desc()).limit(20).all()
    return ok([r.serialize() for r in reviews])


@bp.post("/reviews")
@login_required
def create_review():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    product = Product.query.get(product_id)
    if product is None:
        return error("Producto no encontrado", 404)

    # Solo clientes que compraron el producto
    bought = OrderItem.query.join(Order).filter(
        OrderItem.product_id == product_id,
        Order.user_id == g.user.id,
        Order.status.in_(["paid", "preparing", "shipped", "delivered"]),
    ).first()
    if bought is None:
        return error("Debes comprar este producto para reseñarlo", 403)

    existing = Review.query.filter_by(user_id=g.user.id, product_id=product_id).first()
    if existing:
        return error("Ya reseñaste este producto", 409)

    rating = int(data.get("rating", 5))
    if rating < 1 or rating > 5:
        return error("Calificación inválida", 422)

    review = Review(
        product_id=product_id,
        user_id=g.user.id,
        order_id=bought.order_id,
        rating=rating,
        title=(data.get("title") or "").strip()[:190] or None,
        comment=(data.get("comment") or "").strip() or None,
        images=data.get("images") or [],
        is_approved=True,
    )
    db.session.add(review)
    db.session.flush()
    product.update_rating()
    db.session.commit()
    return ok(review.serialize(), 201, "Gracias por tu reseña")


@bp.get("/blog")
def blog_list():
    from ..models import BlogPost
    items = BlogPost.query.filter_by(status="published") \
        .order_by(BlogPost.published_at.desc()).all()
    category = request.args.get("category")
    if category:
        items = [p for p in items if p.category == category]
    return ok([p.serialize() for p in items])


@bp.get("/blog/<slug>")
def blog_detail(slug):
    from ..models import BlogPost
    post = BlogPost.query.filter_by(slug=slug, status="published").first()
    if post is None:
        return error("Artículo no encontrado", 404)
    return ok(post.serialize(full=True))
