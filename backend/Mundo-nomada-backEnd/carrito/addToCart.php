<?php
declare(strict_types=1);

require_once __DIR__ . '/seguridad_carrito.php';

$userId = usuarioSesionCarrito(['POST', 'OPTIONS']);
$input = entradaJsonCarrito();
$productId = filter_var($input['producto_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$quantity = filter_var($input['cantidad'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000]]);
// La talla es opcional solo si el producto tiene una única variante
// (por ejemplo, carritos de invitado guardados antes de existir las tallas)
$varianteId = ($input['variante_id'] ?? null) === null
    ? null
    : filter_var($input['variante_id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if (!$productId || !$quantity || $varianteId === false) {
    responderJson(['resultado' => 'ERROR', 'mensaje' => 'Producto, talla o cantidad no válidos.'], 400);
}

$pdo = retornarConexionPostgres();
try {
    $pdo->beginTransaction();
    $variantes = $pdo->prepare(
        'select id, stock from public.producto_variantes where producto_id = :product_id order by orden, id for update'
    );
    $variantes->execute([':product_id' => $productId]);
    $tallas = $variantes->fetchAll();
    if ($tallas === []) {
        throw new RuntimeException('El producto ya no existe.');
    }
    if ($varianteId === null) {
        if (count($tallas) !== 1) {
            throw new RuntimeException('Elige una talla.');
        }
        $variante = $tallas[0];
    } else {
        $encontradas = array_values(array_filter($tallas, static fn(array $t): bool => (int) $t['id'] === $varianteId));
        if ($encontradas === []) {
            throw new RuntimeException('Esa talla ya no está disponible.');
        }
        $variante = $encontradas[0];
    }

    $cart = $pdo->prepare(
        'select id, cantidad from public.carrito
         where user_id = :user_id and variante_id = :variante_id for update'
    );
    $cart->execute([':user_id' => $userId, ':variante_id' => $variante['id']]);
    $item = $cart->fetch();
    $newQuantity = $quantity + ($item ? (int) $item['cantidad'] : 0);
    if ($newQuantity > (int) $variante['stock']) {
        throw new RuntimeException('No hay suficientes unidades disponibles de esta talla.');
    }

    if ($item) {
        $pdo->prepare('update public.carrito set cantidad = :quantity where id = :id and user_id = :user_id')
            ->execute([':quantity' => $newQuantity, ':id' => $item['id'], ':user_id' => $userId]);
    } else {
        $pdo->prepare(
            'insert into public.carrito (user_id, producto_id, variante_id, cantidad)
             values (:user_id, :product_id, :variante_id, :quantity)'
        )->execute([
            ':user_id' => $userId, ':product_id' => $productId,
            ':variante_id' => $variante['id'], ':quantity' => $quantity,
        ]);
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
