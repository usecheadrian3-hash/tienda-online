"""
Carga datos iniciales de demostración y configuración de la tienda.

Uso:
    python seed.py

Crea: roles, admin, categorías, marcas, productos, variantes, reseñas,
cupones, promociones, banners, blog, suscriptores y configuración.
"""
import json
import os
import random
import sys
from datetime import datetime, timedelta

from app import create_app
from app.extensions import db
from app.models import (
    Role, User, Category, Brand, Product, ProductImage, ProductVariant,
    Coupon, Promotion, Banner, BlogPost, NewsletterSubscriber, Setting,
    Review,
)
from app.utils.helpers import slugify

def IMG(kw, lock, w=900, h=900):
    return f"https://loremflickr.com/{w}/{h}/{kw}?lock={lock}"


PRODUCT_IMG_KEYWORDS = {
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

CATEGORY_IMG_KEYWORDS = {
    "moda": "fashion",
    "electronica": "electronics",
    "belleza": "beauty",
    "deportes": "sports",
    "hogar": "home-interior",
    "accesorios": "accessories",
}

BLOG_IMG_KEYWORDS = {
    "5-tendencias-de-moda-que-dominaran-la-proxima-temporada": "fashion",
    "guia-completa-para-elegir-tus-auriculares-perfectos": "headphones",
    "rutina-de-skincare-en-4-pasos-para-pieles-radiantes": "skincare",
    "como-armar-un-home-gym-en-espacios-pequenos": "home-gym",
}


def main():
    app = create_app()
    with app.app_context():
        print("Poblando base de datos...")

        # ---- Roles ----
        if Role.query.count() == 0:
            db.session.add_all([
                Role(name="admin", description="Administrador del sistema"),
                Role(name="customer", description="Cliente de la tienda"),
            ])
            db.session.commit()

        admin_role = Role.query.filter_by(name="admin").first()
        customer_role = Role.query.filter_by(name="customer").first()

        # ---- Admin ----
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@tienda.com")
        if not User.query.filter_by(email=admin_email).first():
            admin = User(
                name="Administrador",
                email=admin_email,
                role_id=admin_role.id,
            )
            admin.set_password(os.environ.get("ADMIN_PASSWORD", "Admin123!"))
            db.session.add(admin)

        # ---- Cliente demo ----
        if not User.query.filter_by(email="cliente@tienda.com").first():
            client = User(name="Cliente Demo", email="cliente@tienda.com",
                          phone="+57 300 123 4567", role_id=customer_role.id)
            client.set_password("Cliente123!")
            db.session.add(client)

        # ---- Categorías ----
        categories = [
            ("Moda", "Descubre lo último en ropa y calzado", 1),
            ("Electrónica", "Tecnología que se siente premium", 2),
            ("Belleza", "Cuidado personal y cosmética", 3),
            ("Deportes", "Equípate para tu mejor versión", 4),
            ("Hogar", "Espacios que inspiran", 5),
            ("Accesorios", "Detalles que hacen la diferencia", 6),
        ]
        cats = {}
        for i, (name, desc, order) in enumerate(categories):
            slug = slugify(name)
            cat = Category.query.filter_by(slug=slug).first()
            if cat is None:
                cat = Category(name=name, slug=slug, description=desc,
                               image=IMG(CATEGORY_IMG_KEYWORDS.get(slug, slug),
                                         lock=i + 1, w=1200, h=760),
                               sort_order=order)
                db.session.add(cat)
                db.session.flush()
            cats[slug] = cat

        # ---- Marcas ----
        brands = [
            ("Aurora", "Diseño y tecnología"), ("Nimbus", "Elegancia atemporal"),
            ("Vela", "Esencia y cuidado"), ("Terra", "Hecho para durar"),
            ("Pulse", "Movimiento y energía"), ("Kova", "Premium minimalista"),
            ("Solstice", "Luz y ambiente"), ("Halen", "Moda contemporánea"),
            ("Cero", "Funcionalidad pura"), ("Noma", "Nómada urbano"),
        ]
        b_map = {}
        for name, desc in brands:
            slug = slugify(name)
            brand = Brand.query.filter_by(slug=slug).first()
            if brand is None:
                brand = Brand(name=name, slug=slug, description=desc,
                              logo=f"https://ui-avatars.com/api/?name={name.replace(' ','+')}&size=128&background=0E1116&color=FF5A3C&bold=true")
                db.session.add(brand)
                db.session.flush()
            b_map[slug] = brand

        # ---- Productos ----
        products = [
            # (nombre, categoria, marca, precio, compare_at, stock, flags, desc, tags, variantes)
            ("Auriculares Inalámbricos Kova Pro", "electronica", "kova", 349900, 499900, 34,
             dict(is_featured=True, is_best_seller=True, is_new=True, is_on_sale=True),
             "Auriculares con cancelación activa de ruido, 30 h de batería y sonido de alta fidelidad.",
             ["audio", "wireless"], [
                 ("Negro", None, 349900, 499900, 18), ("Blanco", None, 349900, 499900, 10),
                 ("Gris", None, 349900, 499900, 6),
             ]),
            ("Smartwatch Pulse 5", "electronica", "pulse", 289900, 369900, 22,
             dict(is_featured=True, is_best_seller=True, is_on_sale=True),
             "Reloj inteligente con GPS, monitor de sueño y resistencia al agua.",
             ["wearable", "tecnologia"], [
                 ("Negro", None, 289900, 369900, 14), ("Azul", None, 289900, 369900, 8),
             ]),
            ("Zapatillas Urbanas Halen Run", "moda", "halen", 329900, 429900, 28,
             dict(is_featured=True, is_best_seller=True, is_new=True, is_on_sale=True),
             "Zapatillas ligeras con amortiguación reactiva para el día a día.",
             ["calzado", "deportivo"], [
                 (None, "39", 329900, 429900, 4), (None, "40", 329900, 429900, 5),
                 (None, "41", 329900, 429900, 6), (None, "42", 329900, 429900, 6),
                 (None, "43", 329900, 429900, 4), (None, "44", 329900, 429900, 3),
             ]),
            ("Botella Térmica Noma 750ml", "accesorios", "noma", 79900, 99900, 60,
             dict(is_best_seller=True, is_on_sale=True, is_featured=True),
             "Mantiene tu bebida fría 24 h o caliente 12 h. Acero inoxidable.",
             ["hidratacion", "viaje"], [
                 ("Negro", None, 79900, 99900, 20), ("Verde", None, 79900, 99900, 20),
                 ("Rosa", None, 79900, 99900, 20),
             ]),
            ("Perfume Vela Essence 100ml", "belleza", "vela", 189900, 249900, 18,
             dict(is_featured=True, is_on_sale=True, is_new=True),
             "Fragancia amaderada con notas de sándalo y vainilla.",
             ["fragancia", "premium"], []),
            ("Chaqueta Aurora Bomber", "moda", "aurora", 259900, 329900, 14,
             dict(is_featured=True, is_new=True, is_on_sale=True),
             "Chaqueta bomber con interior acolchado y acabados premium.",
             ["ropa", "invierno"], [
                 ("Negro", None, 259900, 329900, 6), ("Beige", None, 259900, 329900, 5),
                 ("Oliva", None, 259900, 329900, 3),
             ]),
            ("Lámpara Solstice Glow", "hogar", "solstice", 139900, 179900, 25,
             dict(is_new=True, is_on_sale=True),
             "Lámpara de escritorio con luz cálida regulable y carga inalámbrica.",
             ["iluminacion", "decoracion"], []),
            ("Teclado Mecánico Cero 75", "electronica", "cero", 219900, 279900, 20,
             dict(is_new=True, is_on_sale=True),
             "Teclado mecánico compacto con switches silenciosos y RGB.",
             ["gaming", "oficina"], [
                 ("Blanco", None, 219900, 279900, 12), ("Negro", None, 219900, 279900, 8),
             ]),
            ("Kit Yoga Terra 4mm", "deportes", "terra", 99900, 129900, 40,
             dict(is_best_seller=True, is_on_sale=True),
             "Colchoneta antideslizante con bolsa de transporte incluida.",
             ["fitness", "yoga"], []),
            ("Mochila Urbana Cero 24L", "accesorios", "cero", 159900, 199900, 30,
             dict(is_best_seller=True, is_new=True, is_on_sale=True),
             "Mochila impermeable con compartimento para portátil de 15\".",
             ["viaje", "urbano"], [
                 ("Negro", None, 159900, 199900, 15), ("Gris", None, 159900, 199900, 15),
             ]),
            ("Serum Vitamina C Vela", "belleza", "vela", 119900, 149900, 26,
             dict(is_best_seller=True, is_on_sale=True),
             "Serum iluminador con vitamina C y ácido hialurónico.",
             ["skincare", "cuidado"], []),
            ("Altavoz Bluetooth Pulse Mini", "electronica", "pulse", 159900, 199900, 32,
             dict(is_featured=True, is_on_sale=True, is_best_seller=True),
             "Sonido envolvente 360° con batería de 20 horas.",
             ["audio", "portatil"], [
                 ("Negro", None, 159900, 199900, 16), ("Azul", None, 159900, 199900, 16),
             ]),
            ("Camiseta Oversize Halen", "moda", "halen", 59900, 79900, 55,
             dict(is_best_seller=True, is_on_sale=True),
             "Algodón peinado 240 g/m² con corte oversize.",
             ["ropa", "basico"], [
                 (None, "S", 59900, 79900, 12), (None, "M", 59900, 79900, 15),
                 (None, "L", 59900, 79900, 15), (None, "XL", 59900, 79900, 13),
             ]),
            ("Gafas de Sol Aurora 1960", "accesorios", "aurora", 129900, 169900, 21,
             dict(is_new=True, is_on_sale=True),
             "Montura acetate con protección UV400.",
             ["accesorio", "sol"], [
                 ("Negro", None, 129900, 169900, 11), ("Tortuga", None, 129900, 169900, 10),
             ]),
            ("Set Vela Aroma Home", "hogar", "vela", 89900, 119900, 38,
             dict(is_featured=True, is_on_sale=True),
             "Trío de velas aromáticas de soja con madera de cedro.",
             ["aroma", "hogar"], []),
            ("Reloj Minimalista Noma", "accesorios", "noma", 179900, 229900, 17,
             dict(is_new=True, is_on_sale=True, is_featured=True),
             "Reloj de cuarzo con correa de cuero italiano.",
             ["reloj", "premium"], [
                 ("Negro", None, 179900, 229900, 9), ("Cognac", None, 179900, 229900, 8),
             ]),
            ("Cafetera de Prensa Terra 1L", "hogar", "terra", 109900, 139900, 27,
             dict(is_best_seller=True),
             "Prensa francesa de doble pared para café más caliente.",
             ["cafe", "hogar"], []),
            ("Mancuernas Ajustables Pulse 24kg", "deportes", "pulse", 389900, 499900, 12,
             dict(is_on_sale=True, is_new=True),
             "Par de mancuernas ajustables 5-24 kg con base incluida.",
             ["fitness", "fuerza"], []),
            ("Mouse Ergonómico Cero", "electronica", "cero", 89900, 119900, 44,
             dict(is_best_seller=True, is_on_sale=True),
             "Mouse inalámbrico ergonómico con sensor silencioso.",
             ["oficina", "tecnologia"], [
                 ("Negro", None, 89900, 119900, 22), ("Blanco", None, 89900, 119900, 22),
             ]),
            ("Kit Skincare Vela 4 pasos", "belleza", "vela", 249900, 329900, 15,
             dict(is_new=True, is_on_sale=True),
             "Rutina completa: limpiador, tónico, suero y humectante.",
             ["skincare", "kit"], []),
            ("Alfombra de Yoga Terra Pro", "deportes", "terra", 179900, 229900, 19,
             dict(is_new=True),
             "Alfombra de corcho con superficie antideslizante.",
             ["yoga", "fitness"], []),
            ("Zapatillas Aurora Court", "moda", "aurora", 279900, 349900, 16,
             dict(is_featured=True, is_new=True, is_on_sale=True),
             "Zapatillas clásicas de tenis con cuero premium.",
             ["calzado", "classic"], [
                 (None, "39", 279900, 349900, 3), (None, "40", 279900, 349900, 3),
                 (None, "41", 279900, 349900, 4), (None, "42", 279900, 349900, 3),
                 (None, "43", 279900, 349900, 3),
             ]),
            ("Difusor Aroma Solstice", "hogar", "solstice", 99900, 129900, 24,
             dict(is_on_sale=True),
             "Difusor ultrasónico con luces LED y apagado automático.",
             ["aroma", "relax"], []),
            ("Banda Deportiva Pulse Flex", "deportes", "pulse", 129900, 159900, 33,
             dict(is_best_seller=True, is_on_sale=True),
             "Banda de actividad con frecuencia cardíaca y notificaciones.",
             ["wearable", "fitness"], [
                 ("Negro", None, 129900, 159900, 17), ("Rosa", None, 129900, 159900, 16),
             ]),
        ]

        seeds_used = 0
        for (name, cat_slug, brand_slug, price, compare, stock, flags,
             desc, tags, variants) in products:
            slug = slugify(name)
            product = Product.query.filter_by(slug=slug).first()
            if product is not None:
                continue
            seeds_used += 1
            product = Product(
                name=name,
                slug=slug,
                sku=f"SKU-{seeds_used:04d}",
                category_id=cats[cat_slug].id,
                brand_id=b_map[brand_slug].id,
                short_description=desc[:180],
                description=desc + "\n\nMateriales y acabados de alta calidad, verificados por nuestro equipo.\nGarantía de 12 meses y devolución sin costo en 30 días.",
                features=["Calidad garantizada", "Envío seguro", "Garantía 12 meses",
                          "Devolución en 30 días"],
                price=price,
                compare_at_price=compare,
                cost=round(price * 0.55),
                weight_kg=round(random.uniform(0.3, 2.5), 2),
                stock=stock,
                stock_min=5,
                is_active=True,
                sold_count=random.randint(40, 900),
                is_featured=flags.get("is_featured", False),
                is_new=flags.get("is_new", False),
                is_best_seller=flags.get("is_best_seller", False),
                is_on_sale=flags.get("is_on_sale", False),
                rating_avg=round(random.uniform(4.2, 5.0), 2),
                rating_count=random.randint(3, 260),
                views=random.randint(100, 5000),
                tags=",".join(tags),
            )
            db.session.add(product)
            db.session.flush()

            images = [
                (IMG(PRODUCT_IMG_KEYWORDS.get(slug, "product"), seeds_used * 10 + 1), True, 0),
                (IMG(PRODUCT_IMG_KEYWORDS.get(slug, "product"), seeds_used * 10 + 2), False, 1),
                (IMG(PRODUCT_IMG_KEYWORDS.get(slug, "product"), seeds_used * 10 + 3), False, 2),
            ]
            for i, (url, primary, pos) in enumerate(images):
                db.session.add(ProductImage(product_id=product.id, url=url,
                                            alt=name, position=pos, is_primary=primary))

            if variants:
                for j, (color, size, vprice, vcompare, vstock) in enumerate(variants):
                    db.session.add(ProductVariant(
                        product_id=product.id,
                        sku=f"{product.sku}-V{j + 1}",
                        name=" / ".join(x for x in (color, size) if x),
                        color=color,
                        size=size,
                        price=vprice,
                        compare_at_price=vcompare,
                        stock=vstock,
                        image=None if j else images[0][0],
                    ))
                product.has_variants = True

        # ---- Reseñas demo ----
        if Review.query.count() == 0:
            client = User.query.filter_by(email="cliente@tienda.com").first()
            demo_reviews = [
                ("Excelente calidad", "El producto superó mis expectativas, llegó rápido y bien empacado."),
                ("Muy recomendado", "Se nota la calidad premium. Lo volvería a comprar."),
                ("Me encantó", "Perfecto para el día a día, muy buena relación precio calidad."),
                ("Increíble", "El servicio fue excelente y el producto es tal cual la foto."),
            ]
            products_all = Product.query.all()
            for product in random.sample(products_all, min(10, len(products_all))):
                title, comment = random.choice(demo_reviews)
                db.session.add(Review(
                    product_id=product.id,
                    user_id=client.id,
                    rating=random.choice([4, 5, 5, 4, 5]),
                    title=title,
                    comment=comment,
                    is_approved=True,
                ))

        # ---- Cupones ----
        if Coupon.query.count() == 0:
            db.session.add_all([
                Coupon(code="VERANO70", type="percent", value=70,
                       min_subtotal=100000, ends_at=datetime.now() + timedelta(days=60),
                       max_uses=500, is_active=True),
                Coupon(code="BIENVENIDO10", type="percent", value=10,
                       min_subtotal=50000, is_active=True),
                Coupon(code="ENVIOGRATIS", type="fixed", value=10000,
                       min_subtotal=150000, is_active=True),
                Coupon(code="PRIMERAPEDIDO15", type="percent", value=15,
                       min_subtotal=80000, ends_at=datetime.now() + timedelta(days=30),
                       is_active=True),
            ])

        # ---- Promociones ----
        if Promotion.query.count() == 0:
            db.session.add_all([
                Promotion(title="OFERTA ESPECIAL", subtitle="Hasta 70% OFF en seleccionados",
                          badge="Solo por tiempo limitado", discount_percent=70,
                          image=IMG("shopping", 11, w=1200, h=760),
                          link="/tienda?sort=discount&on_sale=true",
                          position=1, is_active=True,
                          expires_at=datetime.now() + timedelta(days=30)),
                Promotion(title="NUEVA COLECCIÓN", subtitle="Descubre los nuevos ingresos",
                          badge="Recién llegado", image=IMG("fashion", 12, w=1200, h=760),
                          link="/nuevos", position=2, is_active=True),
            ])

        # ---- Banners ----
        if Banner.query.count() == 0:
            db.session.add_all([
                Banner(text="Envío gratis en pedidos superiores a $300.000", link="/tienda",
                       position="top", sort_order=1, is_active=True),
                Banner(text="Ofertas de verano: hasta 70% OFF", link="/ofertas",
                       position="top", sort_order=2, is_active=True),
                Banner(text="Nueva colección de otoño ya disponible", link="/nuevos",
                       position="hero", sort_order=1, is_active=True),
            ])

        # ---- Blog ----
        if BlogPost.query.count() == 0:
            posts = [
                ("5 tendencias de moda que dominarán la próxima temporada",
                 "Moda", "Tendencias",
                 "El estilo personal es la tendencia más importante de todas. Descubre cómo combinar prendas atemporales con piezas de acento para un look moderno y duradero.",
                 "<h2>Tendencias clave</h2><p>La moda evoluciona y este año lo hace hacia lo esencial: prendas bien hechas, colores neutros con acentos vibrantes y mucha versatilidad.</p><h2>Cómo usarlas</h2><p>Invierte en básicos de calidad y añade accesorios para transformar tu look sin esfuerzo.</p>"),
                ("Guía completa para elegir tus auriculares perfectos",
                 "Electrónica", "Guías",
                 "Cancelación de ruido, batería, sonido. Te ayudamos a elegir los auriculares ideales según tu estilo de vida.",
                 "<h2>¿Qué buscar?</h2><p>La cancelación activa de ruido es clave si viajas o trabajas en espacios ruidosos. La duración de batería define la experiencia diaria.</p><h2>Nuestra recomendación</h2><p>Un equilibrio entre calidad de sonido, comodidad y duración de batería por encima de 24 horas.</p>"),
                ("Rutina de skincare en 4 pasos para pieles radiantes",
                 "Belleza", "Consejos",
                 "Limpiar, tonificar, tratar e hidratar. Una rutina simple que transforma tu piel.",
                 "<h2>Paso a paso</h2><p>1. Limpieza suave. 2. Tónico equilibrador. 3. Suero con vitamina C. 4. Humectante con protección.</p><p>La constancia importa más que la cantidad de productos.</p>"),
                ("Cómo armar un home gym en espacios pequeños",
                 "Deportes", "Guías",
                 "No necesitas un gran espacio. Con las herramientas correctas puedes entrenar en casa.",
                 "<h2>Lo esencial</h2><p>Mancuernas ajustables, una colchoneta y banda de resistencia cubren la mayoría de ejercicios.</p><h2>Rutina</h2><p>Combiná fuerza y movilidad 3 veces por semana para mejores resultados.</p>"),
            ]
            admin = User.query.filter_by(email=admin_email).first()
            for i, (title, cat, tag, excerpt, content) in enumerate(posts):
                db.session.add(BlogPost(
                    title=title, slug=slugify(title), category=cat, tags=tag,
                    excerpt=excerpt, content=content,
                    cover_image=IMG(BLOG_IMG_KEYWORDS.get(slugify(title), "blog"),
                                    i + 1, w=1200, h=760),
                    status="published", published_at=datetime.now(),
                    author_id=admin.id,
                ))

        # ---- Newsletter ----
        if NewsletterSubscriber.query.count() == 0:
            db.session.add(NewsletterSubscriber(email="cliente@tienda.com"))

        # ---- Configuración de la tienda ----
        settings = {
            "store_name": os.environ.get("STORE_NAME", "Tienda"),
            "store_tagline": os.environ.get("STORE_TAGLINE", "Productos seleccionados para ti"),
            "currency": os.environ.get("STORE_CURRENCY", "COP"),
            "currency_symbol": "$",
            "tax_rate": os.environ.get("STORE_TAX_RATE", "19"),
            "tax_name": os.environ.get("STORE_TAX_NAME", "IVA"),
            "tax_enabled": "true",
            "free_shipping_threshold": os.environ.get("FREE_SHIPPING_THRESHOLD", "300000"),
            "shipping_methods": json.dumps([
                {"id": "estandar", "name": "Envío estándar", "cost": 10000, "days": "3-5 días", "active": True},
                {"id": "express", "name": "Envío express", "cost": 20000, "days": "1-2 días", "active": True},
                {"id": "gratis", "name": "Envío gratis", "cost": 0, "days": "5-7 días", "active": True,
                 "min_subtotal": int(os.environ.get("FREE_SHIPPING_THRESHOLD", "300000"))},
            ]),
            "support_email": os.environ.get("STORE_SUPPORT_EMAIL", "soporte@tienda.com"),
            "support_phone": os.environ.get("STORE_SUPPORT_PHONE", "+57 300 000 0000"),
            "store_address": os.environ.get("STORE_ADDRESS", "Calle 0 # 00-00, Bogotá, Colombia"),
            "store_city": "Bogotá",
            "social": json.dumps({"facebook": "", "instagram": "", "twitter": "",
                                  "tiktok": "", "youtube": ""}),
            "hero_title": "Descubre productos que te encantarán",
            "hero_subtitle": "Explora las últimas tendencias y encuentra productos seleccionados para ti.",
            "seo_title": "Tienda — Productos seleccionados para ti",
            "seo_description": "Encuentra moda, tecnología y accesorios seleccionados. Envío a todo el país.",
        }
        for key, value in settings.items():
            setting = Setting.query.filter_by(key=key).first()
            if setting is None:
                db.session.add(Setting(key=key, value=str(value), group_name="general"))

        db.session.commit()
        print("Base de datos poblada correctamente.")
        print(f"  Admin: {admin_email} / {os.environ.get('ADMIN_PASSWORD', 'Admin123!')}")
        print("  Cliente demo: cliente@tienda.com / Cliente123!")
        print(f"  Productos creados: {seeds_used}")


if __name__ == "__main__":
    sys.exit(main())
