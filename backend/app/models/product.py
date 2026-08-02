import json
from datetime import datetime

from ..extensions import db
from .user import utcnow


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("categories.id"))
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    description = db.Column(db.String(500))
    image = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    parent = db.relationship("Category", remote_side=[id], backref="children")
    products = db.relationship("Product", backref="category", lazy="dynamic")

    @property
    def product_count(self):
        return Product.query.filter_by(category_id=self.id, is_active=True).count()

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "image": self.image,
            "is_active": self.is_active,
            "sort_order": self.sort_order,
            "parent_id": self.parent_id,
            "product_count": self.product_count,
        }


class Brand(db.Model):
    __tablename__ = "brands"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False)
    logo = db.Column(db.String(255))
    description = db.Column(db.String(500))
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    products = db.relationship("Product", backref="brand", lazy="dynamic")

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "logo": self.logo,
            "description": self.description,
            "is_active": self.is_active,
            "sort_order": self.sort_order,
        }


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"))
    brand_id = db.Column(db.Integer, db.ForeignKey("brands.id"))
    name = db.Column(db.String(190), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    sku = db.Column(db.String(80), unique=True, nullable=False)
    short_description = db.Column(db.String(400))
    description = db.Column(db.Text)
    features = db.Column(db.JSON)
    price = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    compare_at_price = db.Column(db.Numeric(12, 2))
    cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    weight_kg = db.Column(db.Numeric(8, 3), nullable=False, default=0)
    stock = db.Column(db.Integer, nullable=False, default=0)
    stock_min = db.Column(db.Integer, nullable=False, default=5)
    sold_count = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_featured = db.Column(db.Boolean, nullable=False, default=False)
    is_new = db.Column(db.Boolean, nullable=False, default=False)
    is_best_seller = db.Column(db.Boolean, nullable=False, default=False)
    is_on_sale = db.Column(db.Boolean, nullable=False, default=False)
    has_variants = db.Column(db.Boolean, nullable=False, default=False)
    rating_avg = db.Column(db.Numeric(3, 2), nullable=False, default=0)
    rating_count = db.Column(db.Integer, nullable=False, default=0)
    views = db.Column(db.Integer, nullable=False, default=0)
    tags = db.Column(db.String(500))
    meta_title = db.Column(db.String(190))
    meta_description = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    images = db.relationship(
        "ProductImage", backref="product", cascade="all, delete-orphan",
        order_by="ProductImage.position",
    )
    variants = db.relationship(
        "ProductVariant", backref="product", cascade="all, delete-orphan",
        order_by="ProductVariant.id",
    )
    reviews = db.relationship("Review", backref="product", lazy="dynamic")

    @property
    def primary_image(self):
        for img in self.images:
            if img.is_primary:
                return img.url
        return self.images[0].url if self.images else None

    @property
    def discount_percent(self):
        if self.compare_at_price and float(self.compare_at_price) > float(self.price):
            p = (1 - float(self.price) / float(self.compare_at_price)) * 100
            return int(round(p))
        return 0

    @property
    def stock_status(self):
        if self.stock <= 0:
            return "agotado"
        if self.stock <= self.stock_min:
            return "bajo"
        return "disponible"

    @property
    def features_list(self):
        if not self.features:
            return []
        if isinstance(self.features, str):
            try:
                return json.loads(self.features)
            except (TypeError, ValueError):
                return [f.strip() for f in self.features.splitlines() if f.strip()]
        return self.features

    def effective_price(self, variant=None):
        if variant and variant.price is not None:
            return float(variant.price)
        return float(self.price)

    def effective_stock(self):
        if self.has_variants and self.variants:
            return sum(v.stock for v in self.variants if v.is_active)
        return self.stock

    def serialized_reviews(self):
        from .review import Review
        return [
            r.serialize() for r in self.reviews.filter_by(is_approved=True).order_by(
                Review.created_at.desc()
            ).limit(20)
        ]

    def serialize(self, with_variants=True, with_reviews=False, with_category=True):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "sku": self.sku,
            "short_description": self.short_description,
            "description": self.description,
            "features": self.features_list,
            "price": float(self.price),
            "compare_at_price": float(self.compare_at_price) if self.compare_at_price else None,
            "discount_percent": self.discount_percent,
            "cost": float(self.cost or 0),
            "weight_kg": float(self.weight_kg or 0),
            "stock": self.effective_stock(),
            "stock_status": self.stock_status,
            "sold_count": self.sold_count,
            "is_active": self.is_active,
            "is_featured": self.is_featured,
            "is_new": self.is_new,
            "is_best_seller": self.is_best_seller,
            "is_on_sale": self.is_on_sale,
            "has_variants": self.has_variants,
            "rating_avg": float(self.rating_avg or 0),
            "rating_count": self.rating_count,
            "tags": [t.strip() for t in (self.tags or "").split(",") if t.strip()],
            "views": self.views,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "images": [i.serialize() for i in self.images],
            "primary_image": self.primary_image,
            "category_id": self.category_id,
            "brand_id": self.brand_id,
        }
        if with_category:
            data["category"] = self.category.serialize() if self.category else None
            data["brand"] = self.brand.serialize() if self.brand else None
        if with_variants:
            data["variants"] = [v.serialize() for v in self.variants if v.is_active]
            data["variant_options"] = self.variant_options
        if with_reviews:
            data["reviews"] = self.serialized_reviews()
        return data

    @property
    def variant_options(self):
        colors, sizes = [], []
        for v in self.variants:
            if v.is_active and v.color and v.color not in colors:
                colors.append(v.color)
            if v.is_active and v.size and v.size not in sizes:
                sizes.append(v.size)
        return {"colors": colors, "sizes": sizes}

    def update_rating(self):
        from .review import Review
        reviews = self.reviews.filter_by(is_approved=True).all()
        if reviews:
            avg = sum(r.rating for r in reviews) / len(reviews)
            self.rating_avg = round(avg, 2)
            self.rating_count = len(reviews)
        else:
            self.rating_avg = 0
            self.rating_count = 0


class ProductImage(db.Model):
    __tablename__ = "product_images"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    alt = db.Column(db.String(190))
    position = db.Column(db.Integer, nullable=False, default=0)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)

    def serialize(self):
        return {"id": self.id, "url": self.url, "alt": self.alt, "position": self.position,
                "is_primary": self.is_primary}


class ProductVariant(db.Model):
    __tablename__ = "product_variants"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    sku = db.Column(db.String(80), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    color = db.Column(db.String(60))
    size = db.Column(db.String(60))
    price = db.Column(db.Numeric(12, 2))
    compare_at_price = db.Column(db.Numeric(12, 2))
    stock = db.Column(db.Integer, nullable=False, default=0)
    image = db.Column(db.String(255))
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    def serialize(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "sku": self.sku,
            "name": self.name,
            "color": self.color,
            "size": self.size,
            "price": float(self.price) if self.price is not None else None,
            "compare_at_price": float(self.compare_at_price) if self.compare_at_price else None,
            "stock": self.stock,
            "image": self.image,
            "is_active": self.is_active,
        }


class Inventory(db.Model):
    __tablename__ = "inventory"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("product_variants.id"))
    quantity = db.Column(db.Integer, nullable=False, default=0)
    type = db.Column(db.Enum("in", "out", "adjust", "order", "return"), nullable=False, default="adjust")
    note = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "variant_id": self.variant_id,
            "quantity": self.quantity,
            "type": self.type,
            "note": self.note,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class Favorite(db.Model):
    __tablename__ = "favorites"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    __table_args__ = (db.UniqueConstraint("user_id", "product_id"),)

    product = db.relationship("Product", backref="favorited_by")
