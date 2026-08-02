-- ============================================================
-- TIENDA ONLINE — ESQUEMA MySQL
-- InnoDB + utf8mb4, claves foráneas, índices y unicidad.
-- ============================================================

CREATE DATABASE IF NOT EXISTS ecommerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ecommerce;

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id           INT UNSIGNED NOT NULL,
  name              VARCHAR(120) NOT NULL,
  email             VARCHAR(190) NOT NULL UNIQUE,
  phone             VARCHAR(40) NULL,
  password_hash     VARCHAR(255) NOT NULL,
  avatar            VARCHAR(255) NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  email_verified_at DATETIME NULL,
  last_login_at     DATETIME NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_email (email),
  INDEX idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ADDRESSES (direcciones del usuario)
-- ============================================================
CREATE TABLE addresses (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  label       VARCHAR(60) NOT NULL DEFAULT 'Principal',
  first_name  VARCHAR(120) NOT NULL,
  last_name   VARCHAR(120) NOT NULL,
  phone       VARCHAR(40) NULL,
  address     VARCHAR(255) NOT NULL,
  city        VARCHAR(120) NOT NULL,
  state       VARCHAR(120) NULL,
  postal_code VARCHAR(20) NULL,
  country     VARCHAR(60) NOT NULL DEFAULT 'Colombia',
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT UNSIGNED NULL,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  description VARCHAR(500) NULL,
  image       VARCHAR(255) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_categories_active (is_active),
  INDEX idx_categories_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE brands (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(150) NOT NULL UNIQUE,
  logo        VARCHAR(255) NULL,
  description VARCHAR(500) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brands_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id     INT UNSIGNED NULL,
  brand_id        INT UNSIGNED NULL,
  name            VARCHAR(190) NOT NULL,
  slug            VARCHAR(200) NOT NULL UNIQUE,
  sku             VARCHAR(80) NOT NULL UNIQUE,
  short_description VARCHAR(400) NULL,
  description     TEXT NULL,
  features        JSON NULL,
  price           DECIMAL(12,2) NOT NULL,
  compare_at_price DECIMAL(12,2) NULL,
  cost            DECIMAL(12,2) NULL DEFAULT 0,
  weight_kg       DECIMAL(8,3) NULL DEFAULT 0,
  stock           INT NOT NULL DEFAULT 0,
  stock_min       INT NOT NULL DEFAULT 5,
  sold_count      INT NOT NULL DEFAULT 0,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  is_featured     TINYINT(1) NOT NULL DEFAULT 0,
  is_new          TINYINT(1) NOT NULL DEFAULT 0,
  is_best_seller  TINYINT(1) NOT NULL DEFAULT 0,
  is_on_sale      TINYINT(1) NOT NULL DEFAULT 0,
  has_variants    TINYINT(1) NOT NULL DEFAULT 0,
  rating_avg      DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  views           INT NOT NULL DEFAULT 0,
  tags            VARCHAR(500) NULL,
  meta_title      VARCHAR(190) NULL,
  meta_description VARCHAR(300) NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  INDEX idx_products_category (category_id),
  INDEX idx_products_brand (brand_id),
  INDEX idx_products_price (price),
  INDEX idx_products_active (is_active, is_featured),
  INDEX idx_products_sale (is_on_sale),
  INDEX idx_products_created (created_at),
  FULLTEXT INDEX ft_products (name, short_description, description, sku, tags)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
CREATE TABLE product_images (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  url        VARCHAR(255) NOT NULL,
  alt        VARCHAR(190) NULL,
  position   INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_images_product (product_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PRODUCT VARIANTS (color, talla, stock, precio, imagen)
-- ============================================================
CREATE TABLE product_variants (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id     INT UNSIGNED NOT NULL,
  sku            VARCHAR(80) NOT NULL UNIQUE,
  name           VARCHAR(120) NOT NULL,
  color          VARCHAR(60) NULL,
  size           VARCHAR(60) NULL,
  price          DECIMAL(12,2) NULL,
  compare_at_price DECIMAL(12,2) NULL,
  stock          INT NOT NULL DEFAULT 0,
  image          VARCHAR(255) NULL,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_variants_product (product_id),
  INDEX idx_variants_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INVENTORY (movimientos / auditoría de stock)
-- ============================================================
CREATE TABLE inventory (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  variant_id  INT UNSIGNED NULL,
  quantity    INT NOT NULL DEFAULT 0,
  type        ENUM('in','out','adjust','order','return') NOT NULL DEFAULT 'adjust',
  note        VARCHAR(255) NULL,
  user_id     INT UNSIGNED NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_inventory_product (product_id),
  INDEX idx_inventory_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE favorites (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_favorites UNIQUE (user_id, product_id),
  CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_favorites_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_favorites_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CART
-- ============================================================
CREATE TABLE cart (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NULL,
  token      VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_cart_token UNIQUE (token),
  CONSTRAINT uq_cart_user UNIQUE (user_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_cart_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cart_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id    INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  variant_id INT UNSIGNED NULL,
  quantity   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_cart_item UNIQUE (cart_id, product_id, variant_id),
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES cart(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_cart_items_cart (cart_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE coupons (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(60) NOT NULL UNIQUE,
  type            ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  value           DECIMAL(12,2) NOT NULL DEFAULT 0,
  starts_at       DATETIME NULL,
  ends_at         DATETIME NULL,
  max_uses        INT NULL,
  used_count      INT NOT NULL DEFAULT 0,
  min_subtotal    DECIMAL(12,2) NULL DEFAULT 0,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coupons_active (is_active, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE coupon_usage (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  coupon_id  INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NULL,
  order_id   INT UNSIGNED NULL,
  used_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupon_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_coupon_usage_coupon (coupon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number        VARCHAR(40) NOT NULL UNIQUE,
  user_id             INT UNSIGNED NULL,
  email               VARCHAR(190) NOT NULL,
  first_name          VARCHAR(120) NOT NULL,
  last_name           VARCHAR(120) NOT NULL,
  phone               VARCHAR(40) NULL,
  address             VARCHAR(255) NULL,
  city                VARCHAR(120) NULL,
  state               VARCHAR(120) NULL,
  postal_code         VARCHAR(20) NULL,
  country             VARCHAR(60) NOT NULL DEFAULT 'Colombia',
  shipping_method     VARCHAR(60) NULL,
  shipping_cost       DECIMAL(12,2) NOT NULL DEFAULT 0,
  coupon_code         VARCHAR(60) NULL,
  discount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(8) NOT NULL DEFAULT 'COP',
  payment_method      VARCHAR(60) NULL,
  payment_status      ENUM('pending','processing','approved','rejected','canceled','expired') NOT NULL DEFAULT 'pending',
  payment_transaction VARCHAR(120) NULL,
  paid_at             DATETIME NULL,
  status              ENUM('pending','paid','preparing','shipped','delivered','canceled') NOT NULL DEFAULT 'pending',
  notes               VARCHAR(500) NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_number (order_number),
  INDEX idx_orders_status (status),
  INDEX idx_orders_payment (payment_status),
  INDEX idx_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NULL,
  variant_id   INT UNSIGNED NULL,
  product_name VARCHAR(190) NOT NULL,
  sku          VARCHAR(80) NULL,
  variant_name VARCHAR(190) NULL,
  image        VARCHAR(255) NULL,
  unit_price   DECIMAL(12,2) NOT NULL,
  quantity     INT NOT NULL DEFAULT 1,
  subtotal     DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ORDER STATUS HISTORY (timeline)
-- ============================================================
CREATE TABLE order_status_history (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED NOT NULL,
  status      VARCHAR(40) NOT NULL,
  note        VARCHAR(255) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_status_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_status_order (order_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PAYMENTS (transacciones / historial)
-- ============================================================
CREATE TABLE payments (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id          INT UNSIGNED NOT NULL,
  provider          VARCHAR(60) NOT NULL,
  method            VARCHAR(60) NULL,
  transaction_id    VARCHAR(120) NULL,
  reference         VARCHAR(120) NULL,
  amount            DECIMAL(12,2) NOT NULL,
  currency          VARCHAR(8) NOT NULL DEFAULT 'COP',
  status            ENUM('pending','approved','rejected','canceled','expired','processing') NOT NULL DEFAULT 'pending',
  provider_payload  JSON NULL,
  idempotency_key   VARCHAR(120) NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY uq_payments_idem (idempotency_key),
  INDEX idx_payments_order (order_id),
  INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SHIPMENTS (guías / envíos)
-- ============================================================
CREATE TABLE shipments (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      INT UNSIGNED NOT NULL,
  tracking_code VARCHAR(120) NULL,
  carrier       VARCHAR(120) NULL,
  status        VARCHAR(60) NOT NULL DEFAULT 'pending',
  shipped_at    DATETIME NULL,
  delivered_at  DATETIME NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_shipments_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  order_id    INT UNSIGNED NULL,
  rating      TINYINT NOT NULL DEFAULT 5,
  title       VARCHAR(190) NULL,
  comment     TEXT NULL,
  images      JSON NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_reviews_user_product UNIQUE (user_id, product_id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_reviews_product (product_id, is_approved),
  INDEX idx_reviews_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PROMOTIONS (banners / anuncios)
-- ============================================================
CREATE TABLE promotions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(190) NOT NULL,
  subtitle    VARCHAR(300) NULL,
  image       VARCHAR(255) NULL,
  link        VARCHAR(255) NULL,
  badge       VARCHAR(80) NULL,
  discount_percent INT NULL,
  expires_at  DATETIME NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_promotions_active (is_active, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BANNERS (barra superior / hero)
-- ============================================================
CREATE TABLE banners (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  text        VARCHAR(190) NOT NULL,
  link        VARCHAR(255) NULL,
  position    ENUM('top','hero','middle') NOT NULL DEFAULT 'top',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_banners_active (is_active, position, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BLOG POSTS
-- ============================================================
CREATE TABLE blog_posts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id        INT UNSIGNED NULL,
  title            VARCHAR(190) NOT NULL,
  slug             VARCHAR(200) NOT NULL UNIQUE,
  excerpt          VARCHAR(400) NULL,
  content          LONGTEXT NULL,
  cover_image      VARCHAR(255) NULL,
  category         VARCHAR(80) NULL,
  tags             VARCHAR(300) NULL,
  status           ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at     DATETIME NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_blog_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_blog_status (status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- NEWSLETTER SUBSCRIBERS
-- ============================================================
CREATE TABLE newsletter_subscribers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(190) NOT NULL UNIQUE,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_newsletter_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SETTINGS (configuración central de la tienda)
-- ============================================================
CREATE TABLE settings (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`      VARCHAR(100) NOT NULL UNIQUE,
  `value`    TEXT NULL,
  group_name VARCHAR(60) NOT NULL DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SESSION STORE (sesiones de usuario en servidor, opcional)
-- ============================================================
CREATE TABLE sessions (
  id         VARCHAR(128) PRIMARY KEY,
  user_id    INT UNSIGNED NULL,
  payload    JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ROLES INICIALES
-- ============================================================
INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador del sistema'),
  ('customer', 'Cliente de la tienda');
