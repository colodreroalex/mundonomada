<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['POST', 'OPTIONS']);
$input = entradaJsonCarrito();
$productId = filter_var($input['producto_id'] ?? null, FILTER_VALIDATE_INT);
$quantity = filter_var($input['cantidad'] ?? null, FILTER_VALIDATE_INT);
if (!$productId || !$quantity || $quantity < 1) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto o cantidad no válidos.'], 400);
}

$pdo = retornarConexionPostgres();
try {
    $pdo->beginTransaction();
    $product = $pdo->prepare('select stock from public.productos where id = :id for update');
    $product->execute([':id' => $productId]);
    $stock = $product->fetch();
    if (!$stock) {
        throw new RuntimeException('El producto ya no existe.');
    }

    $cart = $pdo->prepare(
        'select id, cantidad from public.carrito
         where user_id = :user_id and producto_id = :product_id for update'
    );
    $cart->execute([':user_id' => $userId, ':product_id' => $productId]);
    $item = $cart->fetch();
    $newQuantity = $quantity + ($item ? (int) $item['cantidad'] : 0);
    if ($newQuantity > (int) $stock['stock']) {
        throw new RuntimeException('No hay suficientes unidades disponibles.');
    }

    if ($item) {
        $pdo->prepare('update public.carrito set cantidad = :quantity where id = :id and user_id = :user_id')
            ->execute([':quantity' => $newQuantity, ':id' => $item['id'], ':user_id' => $userId]);
    } else {
        $pdo->prepare('insert into public.carrito (user_id, producto_id, cantidad) values (:user_id, :product_id, :quantity)')
            ->execute([':user_id' => $userId, ':product_id' => $productId, ':quantity' => $quantity]);
    }
    $pdo->commit();
    responderJson(['resultado' => 'OK', 'mensaje' => 'Producto añadido al carrito.']);
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    error_log('Mundo Nomada add cart failed: ' . $exception->getMessage());
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'No se pudo actualizar el carrito.'], 500);
} catch (RuntimeException $exception) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    responderJson(['resultado' => 'ERROR', 'mensaje' => $exception->getMessage()], 400);
}
