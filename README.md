# Tienda Online

Tienda de comercio electrónico completa para el mercado colombiano: catálogo, carrito, favoritos, checkout en múltiples pasos, comprobantes (HTML y PDF), email, seguimiento de pedidos, blog, newsletter y panel de administración integral.

## Tecnologías

| Capa       | Tecnología                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18 + Vite + React Router + Swiper + Motion |
| Backend    | Flask 3 (Python 3.10+) + Flask-SQLAlchemy          |
| Base datos | MySQL 8 (producción) · SQLite (desarrollo local)  |
| Pagos      | Módulo pluggable: `test` (dev), Stripe, Mercado Pago (PSE, Bancolombia, tarjetas) |
| PDF        | reportlab                                          |
| Emails     | SMTP (sendmail / SMTP relé)                       |

## Estructura

```
tienda online/
├── backend/            # API Flask
│   ├── app/
│   │   ├── api/        # auth, products, cart, orders, payments, reviews, blog, admin…
│   │   ├── models/     # SQLAlchemy models
│   │   ├── services/   # pagos, settings, email, reportes
│   │   └── utils/
│   ├── run.py          # python run.py
│   ├── seed.py         # datos de demostración + admin + configuración
│   └── requirements.txt
├── frontend/           # React/Vite
│   ├── src/
│   │   ├── pages/      # storefront, account (mi cuenta), admin
│   │   ├── components/
│   │   ├── contexts/   # Auth, Cart, Favorites, Settings
│   │   ├── services/   # api.js (cliente HTTP), formato COP
│   │   └── styles/
│   └── vite.config.js  # proxy /api → http://localhost:5000
├── database/schema.sql # esquema MySQL (InnoDB, utf8mb4)
└── .env.example        # plantilla de variables de entorno
```

## Puesta en marcha (desarrollo)

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux/mac: source .venv/bin/activate
pip install -r requirements.txt
```

Configuración:

1. Copia `.env.example` a `.env` y edítalo.
2. Sin MySQL instalado (desarrollo local): pon `DB_DRIVER=sqlite`. Se crea `backend/dev.sqlite3` automáticamente.
3. Con MySQL: crea la base y el usuario, importa el esquema y configura las credenciales:

```bash
mysql -u root -p < database/schema.sql
```

Base de datos inicial (productos, categorías, marcas, cupones, reseñas, blog, admin y configuración de la tienda):

```bash
python seed.py
```

Arrancar:

```bash
python run.py          # API en http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # App en http://localhost:5173 (proxy /api y /uploads al backend)
```

### 3. Cuentas de prueba

| Rol      | Email             | Contraseña  |
| -------- | ----------------- | ----------- |
| Admin    | admin@tienda.com  | Admin123!   |
| Cliente  | cliente@tienda.com | Cliente123! |
| Cliente  | test@test.com     | Password123!|

## Pagos

`PAYMENT_PROVIDER` en `.env` selecciona el proveedor:

- **`test`** (por defecto en desarrollo): pasarela simulada en `http://localhost:5000/api/payments/test/gateway/<referencia>` con botones *Aprobar / Rechazar / Cancelar*. No se procesan pagos reales. Al aprobar, redirige a la página de éxito y marca el pedido como `paid`.
- **`stripe`**: tarjetas. Configura `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`; expón el endpoint `/api/payments/webhook`.
- **`mercadopago`**: soporta **PSE**, **Bancolombia** y tarjetas en Colombia. Configura `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY` y `MERCADOPAGO_WEBHOOK_SECRET`.

Los datos de tarjeta **nunca** llegan al backend: el pago se crea en el proveedor y el estado final se confirma mediante **webhook** (y polling de estado por referencia). El comprobante solo se emite cuando el pago está aprobado.

## Panel de administración

`http://localhost:5173/admin` (login `admin@tienda.com` / `Admin123!`):

- **Dashboard**: KPIs (ventas, ticket promedio, conversión, stock), gráfico de ventas, top productos y pedidos recientes.
- **Productos**: listado/búsqueda/paginación, activar/desactivar, crear/editar con imágenes, variantes (tallas/colores), características y etiquetas.
- **Pedidos**: filtros por estado, detalle con historial (línea de tiempo) y comprobante.
- **Clientes**: listado, detalle y activar/desactivar.
- **Categorías / Marcas**: CRUD completo.
- **Cupones**: CRUD con tipo (porcentaje/monto fijo), mínimos, vigencia y límites.
- **Inventario**: ajustes de stock (entradas/salidas) y estado de stock bajo/agotado.
- **Contenido**: promociones, banners, entradas de blog, suscriptores de newsletter y moderación de reseñas.
- **Ajustes**: marca, moneda, IVA, envíos (métodos y umbral de envío gratis), contacto, redes sociales y proveedor de pagos.

## Personalización

Todo el branding visible al cliente (nombre, eslogan, hero, moneda, IVA, envíos, contacto, banners) se gestiona desde **Ajustes** del panel y se guarda en la tabla `settings` (con respaldo en `.env` para el seed). No requiere tocar código.

Los pedidos usan números públicos tipo `ORD-20260802-732237`.

## Producción (Ubuntu + MySQL)

```bash
# Backend con gunicorn
pip install gunicorn
gunicorn -w 4 -b 127.0.0.1:5000 "app:create_app()"

# Frontend compilado
cd frontend && npm run build   # genera frontend/dist
```

En producción usa un servidor web (nginx) que sirva `frontend/dist` y haga proxy de `/api` y `/uploads` al backend. Cambia `FRONTEND_URL`, `BACKEND_URL`, claves secretas y el proveedor de pagos real en `.env`, y configura `MAIL_*` para el envío de comprobantes.

## Notas

- En desarrollo el frontend usa el proxy de Vite; el backend usa CORS para admitir otros orígenes.
- Las imágenes de demostración son de `picsum.photos`; súbelas desde el panel de productos para uso real.
- `.gitignore` excluye `.env`, `node_modules`, `dist`, `__pycache__`, bases de datos y logs.
