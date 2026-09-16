<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth/seguridad.php'; require_once __DIR__ . '/../conexion_postgres.php';
exigirAdministrador(['POST']); $data = json_decode(file_get_contents('php://input'), true); $nombre = trim((string) ($data['Nombre'] ?? '')); $descripcion = trim((string) ($data['Descripcion'] ?? ''));
if ($nombre === '' || mb_strlen($nombre) > 50) responderJson(['resultado' => 'ERROR', 'mensaje' => 'Nombre de categoría no válido.'], 400);
try { $q = retornarConexionPostgres()->prepare('insert into public.categorias (nombre, descripcion) values (:nombre, :descripcion) returning id'); $q->execute([':nombre' => $nombre, ':descripcion' => $descripcion ?: null]); responderJson(['resultado' => 'OK', 'mensaje' => 'Categoría registrada correctamente.', 'id' => $q->fetchColumn()], 201); } catch (PDOException $e) { if ($e->getCode() === '23505') responderJson(['resultado' => 'ERROR', 'mensaje' => 'La categoría ya existe.'], 409); error_log('Error categoría: ' . $e->getMessage()); responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo registrar la categoría.'], 500); }
