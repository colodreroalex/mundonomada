<?php
declare(strict_types=1);
require_once __DIR__ . '/../auth/seguridad.php'; require_once __DIR__ . '/../conexion_postgres.php';
exigirAdministrador(['POST']); $data = json_decode(file_get_contents('php://input'), true); $id = filter_var($data['CategoriaID'] ?? null, FILTER_VALIDATE_INT); if ($id === false || $id <= 0) responderJson(['resultado' => 'ERROR', 'mensaje' => 'Categoría no válida.'], 400);
try { $q = retornarConexionPostgres()->prepare('delete from public.categorias where id = :id'); $q->execute([':id' => $id]); if ($q->rowCount() !== 1) responderJson(['resultado' => 'ERROR', 'mensaje' => 'La categoría no existe o tiene productos asociados.'], 409); responderJson(['resultado' => 'OK', 'mensaje' => 'Categoría eliminada correctamente.']); } catch (PDOException $e) { error_log('Error eliminar categoría: ' . $e->getMessage()); responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo eliminar la categoría porque tiene productos asociados.'], 409); }
