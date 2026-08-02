from ..extensions import db
from .user import utcnow


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(40), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    email = db.Column(db.String(190), nullable=False)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(40))
    address = db.Column(db.String(255))
    city = db.Column(db.String(120))
    state = db.Column(db.String(120))
    postal_code = db.Column(db.String(20))
    country = db.Column(db.String(60), nullable=False, default="Colombia")
    shipping_method = db.Column(db.String(60))
    shipping_cost = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    coupon_code = db.Column(db.String(60))
    discount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    currency = db.Column(db.String(8), nullable=False, default="COP")
    payment_method = db.Column(db.String(60))
    payment_status = db.Column(
        db.Enum("pending", "processing", "approved", "rejected", "canceled", "expired"),
        nullable=False, default="pending",
    )
    payment_transaction = db.Column(db.String(120))
    paid_at = db.Column(db.DateTime)
    status = db.Column(
        db.Enum("pending", "paid", "preparing", "shipped", "delivered", "canceled"),
        nullable=False, default="pending",
    )
    notes = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")
    payments = db.relationship("Payment", backref="order", cascade="all, delete-orphan")
    history = db.relationship("OrderStatusHistory", backref="order", cascade="all, delete-orphan",
                              order_by="OrderStatusHistory.created_at")
    shipments = db.relationship("Shipment", backref="order", cascade="all, delete-orphan")
    user = db.relationship("User", backref="orders")

    @property
    def customer_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def add_history(self, status, note=None, commit=True):
        self.history.append(OrderStatusHistory(status=status, note=note))
        if commit:
            db.session.commit()

    def serialize(self, with_items=True):
        data = {
            "id": self.id,
            "order_number": self.order_number,
            "email": self.email,
            "customer": self.customer_name,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "postal_code": self.postal_code,
            "country": self.country,
            "shipping_method": self.shipping_method,
            "shipping_cost": float(self.shipping_cost or 0),
            "coupon_code": self.coupon_code,
            "discount": float(self.discount or 0),
            "tax_amount": float(self.tax_amount or 0),
            "subtotal": float(self.subtotal or 0),
            "total": float(self.total or 0),
            "currency": self.currency,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "payment_transaction": self.payment_transaction,
            "paid_at": self.paid_at.isoformat() + "Z" if self.paid_at else None,
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "user_id": self.user_id,
        }
        if with_items:
            data["items"] = [i.serialize() for i in self.items]
            data["history"] = [h.serialize() for h in self.history]
            data["payments"] = [p.serialize() for p in self.payments]
        return data


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"))
    variant_id = db.Column(db.Integer, db.ForeignKey("product_variants.id"))
    product_name = db.Column(db.String(190), nullable=False)
    sku = db.Column(db.String(80))
    variant_name = db.Column(db.String(190))
    image = db.Column(db.String(255))
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    def serialize(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "variant_id": self.variant_id,
            "product_name": self.product_name,
            "sku": self.sku,
            "variant_name": self.variant_name,
            "image": self.image,
            "unit_price": float(self.unit_price),
            "quantity": self.quantity,
            "subtotal": float(self.subtotal),
        }


class OrderStatusHistory(db.Model):
    __tablename__ = "order_status_history"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    status = db.Column(db.String(40), nullable=False)
    note = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "status": self.status,
            "note": self.note,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    provider = db.Column(db.String(60), nullable=False)
    method = db.Column(db.String(60))
    transaction_id = db.Column(db.String(120))
    reference = db.Column(db.String(120))
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(8), nullable=False, default="COP")
    status = db.Column(
        db.Enum("pending", "approved", "rejected", "canceled", "expired", "processing"),
        nullable=False, default="pending",
    )
    provider_payload = db.Column(db.JSON)
    idempotency_key = db.Column(db.String(120), unique=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def payload(self):
        if not self.provider_payload:
            return {}
        import json as _json
        if isinstance(self.provider_payload, str):
            try:
                return _json.loads(self.provider_payload)
            except (TypeError, ValueError):
                return {}
        return self.provider_payload

    def serialize(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "order_number": self.order.order_number if self.order else None,
            "provider": self.provider,
            "method": self.method,
            "transaction_id": self.transaction_id,
            "reference": self.reference,
            "amount": float(self.amount),
            "currency": self.currency,
            "status": self.status,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class Shipment(db.Model):
    __tablename__ = "shipments"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    tracking_code = db.Column(db.String(120))
    carrier = db.Column(db.String(120))
    status = db.Column(db.String(60), nullable=False, default="pending")
    shipped_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "tracking_code": self.tracking_code,
            "carrier": self.carrier,
            "status": self.status,
            "shipped_at": self.shipped_at.isoformat() + "Z" if self.shipped_at else None,
            "delivered_at": self.delivered_at.isoformat() + "Z" if self.delivered_at else None,
        }


class Cart(db.Model):
    __tablename__ = "cart"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    token = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id"),
        db.UniqueConstraint("token"),
    )

    items = db.relationship("CartItem", backref="cart", cascade="all, delete-orphan")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "token": self.token,
            "items": [i.serialize() for i in self.items],
            "count": sum(i.quantity for i in self.items),
            "subtotal": sum(float(i.subtotal) for i in self.items),
        }


class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey("cart.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    variant_id = db.Column(db.Integer, db.ForeignKey("product_variants.id"))
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)

    __table_args__ = (db.UniqueConstraint("cart_id", "product_id", "variant_id"),)

    product = db.relationship("Product", backref="cart_items")
    variant = db.relationship("ProductVariant", backref="cart_items")

    @property
    def unit_price(self):
        if self.variant and self.variant.price is not None:
            return float(self.variant.price)
        return float(self.product.price)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def serialize(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "variant_id": self.variant_id,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "subtotal": round(self.subtotal, 2),
            "product": {
                "id": self.product.id,
                "name": self.product.name,
                "slug": self.product.slug,
                "sku": self.product.sku,
                "image": self.product.primary_image,
                "price": float(self.product.price),
                "compare_at_price": float(self.product.compare_at_price) if self.product.compare_at_price else None,
                "stock": self.product.stock,
                "has_variants": self.product.has_variants,
            } if self.product else None,
            "variant": self.variant.serialize() if self.variant else None,
        }


class Coupon(db.Model):
    __tablename__ = "coupons"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(60), unique=True, nullable=False)
    type = db.Column(db.Enum("percent", "fixed"), nullable=False, default="percent")
    value = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    starts_at = db.Column(db.DateTime)
    ends_at = db.Column(db.DateTime)
    max_uses = db.Column(db.Integer)
    used_count = db.Column(db.Integer, nullable=False, default=0)
    min_subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def is_valid(self, subtotal):
        now = utcnow()
        if not self.is_active:
            return False, "Cupón inactivo"
        if self.starts_at and now < self.starts_at:
            return False, "El cupón aún no está vigente"
        if self.ends_at and now > self.ends_at:
            return False, "El cupón ha expirado"
        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False, "El cupón agotó sus usos"
        if subtotal < float(self.min_subtotal or 0):
            return False, f"Monto mínimo de compra: {float(self.min_subtotal):,.0f}"
        return True, None

    def discount_for(self, subtotal):
        if self.type == "percent":
            return round(subtotal * float(self.value) / 100.0, 2)
        return min(float(self.value), subtotal)

    def serialize(self):
        return {
            "id": self.id,
            "code": self.code,
            "type": self.type,
            "value": float(self.value),
            "starts_at": self.starts_at.isoformat() + "Z" if self.starts_at else None,
            "ends_at": self.ends_at.isoformat() + "Z" if self.ends_at else None,
            "max_uses": self.max_uses,
            "used_count": self.used_count,
            "min_subtotal": float(self.min_subtotal or 0),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class CouponUsage(db.Model):
    __tablename__ = "coupon_usage"

    id = db.Column(db.Integer, primary_key=True)
    coupon_id = db.Column(db.Integer, db.ForeignKey("coupons.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"))
    used_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {"id": self.id, "coupon_id": self.coupon_id, "user_id": self.user_id,
                "order_id": self.order_id, "used_at": self.used_at.isoformat() + "Z" if self.used_at else None}
