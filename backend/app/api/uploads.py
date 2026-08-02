"""Subida de imágenes (productos, categorías, blog, avatar, reseñas)."""
import os
import uuid

from flask import Blueprint, request, current_app, send_from_directory

from ..auth import login_required, admin_required
from ..utils.helpers import ok, error
from ..services.settings_service import SettingsService

bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")


def save_upload(file):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in current_app.config["ALLOWED_IMAGE_EXT"]:
        return None, "Formato de imagen no permitido"
    folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(folder, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(folder, filename))
    url = f"{current_app.config['BACKEND_URL']}/uploads/{filename}"
    return url, None


@bp.post("")
@admin_required
def upload():
    if "file" not in request.files:
        return error("No se recibió archivo", 422)
    file = request.files["file"]
    url, err = save_upload(file)
    if err:
        return error(err, 422)
    return ok({"url": url}, 201, "Imagen subida")


@bp.post("/public")
def upload_public():
    """Subida pública limitada (reseñas con imagen)."""
    if "file" not in request.files:
        return error("No se recibió archivo", 422)
    file = request.files["file"]
    url, err = save_upload(file)
    if err:
        return error(err, 422)
    return ok({"url": url}, 201, "Imagen subida")
