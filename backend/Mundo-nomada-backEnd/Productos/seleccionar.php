<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth/seguridad.php'; require_once __DIR__ . '/../conexion_postgres.php';
aplicarCors(['GET']); if ($_SERVER['REQUEST_METHOD'] !== 'GET') responderJson(['resultado' => 'ERROR', 'mensaje' => 'Método no permitido.'], 405);
$id = filter_var($_GET['ProductoID'] ?? null, FILTER_VALIDATE_INT); if ($id === false || $id <= 0) responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto no válido.'], 400);
try { $q = retornarConexionPostgres()->prepare('select id as "ProductoID", nombre, precio, descripcion, stock, categoria_id as "categoriaID", imagen_url as imagen, color, talla from public.productos where id = :id'); $q->execute([':id' => $id]); $product = $q->fetch(); if (!$product) responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto no encontrado.'], 404); responderJson(['resultado' => 'OK', 'producto' => [$product]]); } catch (PDOException $error) { error_log('Error producto: ' . $error->getMessage()); responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo consultar el producto.'], 500); }
