"""Actualiza todas las imagenes del catalogo con fotos reales que coinciden
con cada producto, categoria, blog y promocion. Descarga las imagenes a
backend/uploads y apunta la base de datos a /uploads/...

Uso:
    python update_images.py
"""
import os
import sys

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db  # noqa: E402
from app.models import (  # noqa: E402
    BlogPost, Category, Product, ProductImage, Promotion,
)

BASE = "https://loremflickr.com"
UPLOAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")

PRODUCT_KEYWORDS = {
    "auriculares-inalambricos-kova-pro": "headphones",
    "smartwatch-pulse-5": "smartwatch",
    "zapatillas-urbanas-halen-run": "running-shoes",
    "botella-termica-noma-750ml": "bottle",
    "perfume-vela-essence-100ml": "perfume",
    "chaqueta-aurora-bomber": "coat",
    "lampara-solstice-glow": "lamp",
    "teclado-mecanico-cero-75": "keyboard",
    "kit-yoga-terra-4mm": "yoga-mat",
    "mochila-urbana-cero-24l": "backpack",
    "serum-vitamina-c-vela": "serum",
    "altavoz-bluetooth-pulse-mini": "speaker",
    "camiseta-oversize-halen": "tshirt",
    "gafas-de-sol-aurora-1960": "sunglasses",
    "set-vela-aroma-home": "candles",
    "reloj-minimalista-noma": "wristwatch",
    "cafetera-de-prensa-terra-1l": "coffee",
    "mancuernas-ajustables-pulse-24kg": "weights",
    "mouse-ergonomico-cero": "mouse",
    "kit-skincare-vela-4-pasos": "skincare",
    "alfombra-de-yoga-terra-pro": "yoga",
    "zapatillas-aurora-court": "sneakers",
    "difusor-aroma-solstice": "diffuser",
    "banda-deportiva-pulse-flex": "fitness-band",
}

CATEGORY_KEYWORDS = {
    "moda": "fashion",
    "electronica": "electronics",
    "belleza": "beauty",
    "deportes": "sports",
    "hogar": "home-interior",
    "accesorios": "accessories",
}

BLOG_KEYWORDS = {
    "como-armar-un-home-gym-en-espacios-pequenos": "home-gym",
    "rutina-de-skincare-en-4-pasos-para-pieles-radiantes": "skincare",
    "guia-completa-para-elegir-tus-auriculares-perfectos": "headphones",
    "5-tendencias-de-moda-que-dominaran-la-proxima-temporada": "fashion",
}

PROMO_KEYWORDS = {
    "OFERTA ESPECIAL": "shopping",
    "NUEVA COLECCIÓN": "fashion",
}


def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    for attempt in (1, 2):
        try:
            r = requests.get(url, timeout=40)
            if r.status_code == 200 and len(r.content) > 1000:
                with open(dest, "wb") as f:
                    f.write(r.content)
                return True
        except Exception as e:  # noqa: BLE001
            print(f"  error descargando {url}: {e}")
    return False


def main():
    ok = 0
    fail = 0

    app = create_app()
    with app.app_context():
        for p in Product.query.all():
            kw = PRODUCT_KEYWORDS.get(p.slug)
            if not kw:
                print(f"  sin keyword: {p.name}")
                fail += 1
                continue
            urls = []
            good = True
            for i in range(1, 4):
                dest = os.path.join(UPLOAD, "products", f"{p.slug}-{i}.jpg")
                if download(f"{BASE}/900/900/{kw}?lock={p.id * 10 + i}", dest):
                    urls.append(f"/uploads/products/{p.slug}-{i}.jpg")
                else:
                    good = False
                    break
            if not good:
                print(f"  FALLO descarga: {p.name}")
                fail += 1
                continue
            imgs = list(p.images)
            for idx, u in enumerate(urls):
                if idx < len(imgs):
                    imgs[idx].url = u
                    imgs[idx].is_primary = idx == 0
                else:
                    db.session.add(ProductImage(
                        product_id=p.id, url=u, alt=p.name,
                        position=idx, is_primary=idx == 0,
                    ))
            for extra in imgs[3:]:
                extra.url = urls[-1]
            for v in p.variants:
                if not v.image or v.image.startswith("http"):
                    v.image = urls[0]
            ok += 1
            print(f"  OK {p.name} -> {urls[0]}")

        for c in Category.query.all():
            kw = CATEGORY_KEYWORDS.get(c.slug)
            if not kw:
                continue
            dest = os.path.join(UPLOAD, "categories", f"{c.slug}.jpg")
            if download(f"{BASE}/1200/760/{kw}?lock={c.id * 7 + 1}", dest):
                c.image = f"/uploads/categories/{c.slug}.jpg"
                print(f"  OK categoria {c.name}")

        for b in BlogPost.query.all():
            kw = BLOG_KEYWORDS.get(b.slug)
            if not kw:
                continue
            dest = os.path.join(UPLOAD, "blog", f"{b.slug}.jpg")
            if download(f"{BASE}/1200/760/{kw}?lock={b.id * 5 + 1}", dest):
                b.cover_image = f"/uploads/blog/{b.slug}.jpg"
                print(f"  OK blog {b.title}")

        for pr in Promotion.query.all():
            kw = PROMO_KEYWORDS.get(pr.title.upper())
            if not kw:
                continue
            dest = os.path.join(UPLOAD, "promos", f"{pr.id}.jpg")
            if download(f"{BASE}/1200/760/{kw}?lock={pr.id * 3 + 2}", dest):
                pr.image = f"/uploads/promos/{pr.id}.jpg"
                print(f"  OK promo {pr.title}")

        db.session.commit()
        print(f"\nListo. Actualizados: {ok}, fallidos: {fail}")


if __name__ == "__main__":
    main()
