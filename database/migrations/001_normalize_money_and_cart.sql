-- Migración para una instalación antigua. Haz una copia de seguridad antes.
-- Ejecutar solamente después de verificar que esta consulta no devuelve filas:
-- SELECT user_id, producto_id, COUNT(*) FROM carrito GROUP BY user_id, producto_id HAVING COUNT(*) > 1;

START TRANSACTION;

ALTER TABLE productos
  MODIFY precio DECIMAL(10,2) NOT NULL;

ALTER TABLE orders
  MODIFY total DECIMAL(10,2) NOT NULL;

ALTER TABLE order_items
  MODIFY precio_unitario DECIMAL(10,2) NOT NULL;

ALTER TABLE carrito
  ADD CONSTRAINT carrito_user_producto_unique UNIQUE (user_id, producto_id);

-- Opcional pero recomendado: se podrán guardar los datos de envío y la
-- referencia del proveedor de pago cuando el checkout los implemente.
ALTER TABLE orders
  MODIFY estado ENUM('pendiente', 'pagado', 'enviado', 'completado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  ADD COLUMN payment_reference VARCHAR(191) DEFAULT NULL AFTER estado,
  ADD COLUMN shipping_name VARCHAR(100) DEFAULT NULL AFTER payment_reference,
  ADD COLUMN shipping_address VARCHAR(255) DEFAULT NULL AFTER shipping_name,
  ADD COLUMN shipping_phone VARCHAR(30) DEFAULT NULL AFTER shipping_address,
  ADD UNIQUE KEY orders_payment_reference_unique (payment_reference);

COMMIT;
