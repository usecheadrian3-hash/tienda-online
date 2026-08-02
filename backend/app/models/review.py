import json

from ..extensions import db
from .user import utcnow


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"))
    rating = db.Column(db.Integer, nullable=False, default=5)
    title = db.Column(db.String(190))
    comment = db.Column(db.Text)
    images = db.Column(db.JSON)
    is_approved = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    __table_args__ = (db.UniqueConstraint("user_id", "product_id"),)

    user = db.relationship("User", backref="reviews")

    def images_list(self):
        if not self.images:
            return []
        if isinstance(self.images, str):
            try:
                return json.loads(self.images)
            except (TypeError, ValueError):
                return []
        return self.images

    def serialize(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "user": {
                "id": self.user.id,
                "name": self.user.name,
            } if self.user else None,
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "images": self.images_list(),
            "is_approved": self.is_approved,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
