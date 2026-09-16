-- Mundo Nómada: esquema reproducible sin datos personales.
-- Compatible con MySQL 8+ y MariaDB 10.4+.
-- Los importes se guardan como DECIMAL, nunca como FLOAT.

CREATE DATABASE IF NOT EXISTS mundonomada
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mundonomada;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  remember_token VARCHAR(255) DEFAULT NULL,
  token_expiry DATETIME DEFAULT NULL,
  password_updated_at DATETIME DEFAULT NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias (
  CategoriaID INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(50) NOT NULL,
  Descripcion TEXT DEFAULT NULL,
  PRIMARY KEY (CategoriaID),
  UNIQUE KEY categorias_nombre_unique (Nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos (
  ProductoID INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  categoriaID INT UNSIGNED DEFAULT NULL,
  imagen LONGTEXT DEFAULT NULL,
  color VARCHAR(50) DEFAULT NULL,
  talla VARCHAR(10) DEFAULT NULL,
  PRIMARY KEY (ProductoID),
  KEY productos_categoria_idx (categoriaID),
  CONSTRAINT productos_precio_no_negativo CHECK (precio >= 0),
  CONSTRAINT productos_categoria_fk
    FOREIGN KEY (categoriaID) REFERENCES categorias (CategoriaID)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE carrito (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY carrito_user_producto_unique (user_id, producto_id),
  KEY carrito_producto_idx (producto_id),
  CONSTRAINT carrito_cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT carrito_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT carrito_producto_fk FOREIGN KEY (producto_id) REFERENCES productos (ProductoID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente', 'pagado', 'enviado', 'completado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  payment_reference VARCHAR(191) DEFAULT NULL,
  shipping_name VARCHAR(100) DEFAULT NULL,
  shipping_address VARCHAR(255) DEFAULT NULL,
  shipping_phone VARCHAR(30) DEFAULT NULL,
  PRIMARY KEY (id),
  KEY orders_user_fecha_idx (user_id, fecha),
  UNIQUE KEY orders_payment_reference_unique (payment_reference),
  CONSTRAINT orders_total_no_negativo CHECK (total >= 0),
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY order_items_producto_idx (producto_id),
  CONSTRAINT order_items_cantidad_positiva CHECK (cantidad > 0),
  CONSTRAINT order_items_precio_no_negativo CHECK (precio_unitario >= 0),
  CONSTRAINT order_items_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT order_items_producto_fk FOREIGN KEY (producto_id) REFERENCES productos (ProductoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
