from flask import Blueprint

from . import auth, products, pages, cart, favorites, extras, orders, payments, uploads, admin

api = Blueprint("api", __name__)


def register_blueprints(app):
    for bp in (
        auth.bp, products.bp, pages.bp, cart.bp, favorites.bp, extras.bp,
        orders.bp, payments.bp, uploads.bp, admin.bp,
    ):
        app.register_blueprint(bp)
