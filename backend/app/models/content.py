from ..extensions import db
from .user import utcnow


class Promotion(db.Model):
    __tablename__ = "promotions"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(190), nullable=False)
    subtitle = db.Column(db.String(300))
    image = db.Column(db.String(255))
    link = db.Column(db.String(255))
    badge = db.Column(db.String(80))
    discount_percent = db.Column(db.Integer)
    expires_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    position = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "subtitle": self.subtitle,
            "image": self.image,
            "link": self.link,
            "badge": self.badge,
            "discount_percent": self.discount_percent,
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None,
            "is_active": self.is_active,
            "position": self.position,
        }


class Banner(db.Model):
    __tablename__ = "banners"

    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(190), nullable=False)
    link = db.Column(db.String(255))
    position = db.Column(db.Enum("top", "hero", "middle"), nullable=False, default="top")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "text": self.text,
            "link": self.link,
            "position": self.position,
            "is_active": self.is_active,
            "sort_order": self.sort_order,
        }


class BlogPost(db.Model):
    __tablename__ = "blog_posts"

    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    title = db.Column(db.String(190), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    excerpt = db.Column(db.String(400))
    content = db.Column(db.Text)
    cover_image = db.Column(db.String(255))
    category = db.Column(db.String(80))
    tags = db.Column(db.String(300))
    status = db.Column(db.Enum("draft", "published"), nullable=False, default="draft")
    published_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    author = db.relationship("User", backref="blog_posts")

    def serialize(self, full=False):
        data = {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "excerpt": self.excerpt,
            "cover_image": self.cover_image,
            "category": self.category,
            "tags": [t.strip() for t in (self.tags or "").split(",") if t.strip()],
            "status": self.status,
            "published_at": self.published_at.isoformat() + "Z" if self.published_at else None,
            "author": self.author.name if self.author else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }
        if full:
            data["content"] = self.content
        return data


class NewsletterSubscriber(db.Model):
    __tablename__ = "newsletter_subscribers"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(190), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
        }


class Setting(db.Model):
    __tablename__ = "settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text)
    group_name = db.Column(db.String(60), nullable=False, default="general")
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def serialize(self):
        return {"key": self.key, "value": self.value, "group": self.group_name}
