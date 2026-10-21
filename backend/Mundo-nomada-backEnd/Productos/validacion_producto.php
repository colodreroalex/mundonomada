<?php
declare(strict_types=1);

/*
 * Validación común de productos para el alta y la modificación.
 * No es accesible desde la web (bloqueado en apache-site.conf).
 */

const IMAGEN_MAX_BYTES = 1572864; // 1,5 MB una vez decodificada

/** Firma binaria de los formatos de imagen permitidos. */
function formatoImagenReal(string $bytes): ?string
{
    if (strncmp($bytes, "\xFF\xD8\xFF", 3) === 0) return 'jpeg';
    if (strncmp($bytes, "\x89PNG\r\n\x1A\n", 8) === 0) return 'png';
    if (strncmp($bytes, 'GIF87a', 6) === 0 || strncmp($bytes, 'GIF89a', 6) === 0) return 'gif';
    if (strncmp($bytes, 'RIFF', 4) === 0 && substr($bytes, 8, 4) === 'WEBP') return 'webp';
    return null;
}

/**
 * Acepta: vacío, una ruta propia (/img/...), una URL https o una imagen en
 * base64 (JPG, PNG, WebP o GIF) de tamaño limitado cuyo contenido coincide
 * con el tipo declarado. Rechaza SVG, javascript:, HTML y cualquier otra cosa.
 */
function imagenValida($valor): ?string
{
    if ($valor === null || $valor === '') {
        return '';
    }
    if (!is_string($valor)) {
        return null;
    }
    $valor = trim($valor);

    if (preg_match('#^/img/[A-Za-z0-9._/-]{1,200}$#', $valor) && !str_contains($valor, '..')) {
        return $valor;
    }
    if (strlen($valor) <= 500 && preg_match('#^https://[^\s"\'<>]+$#i', $valor) && filter_var($valor, FILTER_VALIDATE_URL)) {
        return $valor;
    }
    if (preg_match('#^data:image/(jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$#', $valor, $m)) {
        $bytes = base64_decode($m[2], true);
        if ($bytes === false || strlen($bytes) > IMAGEN_MAX_BYTES) {
            return null;
        }
        $declarado = $m[1] === 'jpg' ? 'jpeg' : $m[1];
        return formatoImagenReal($bytes) === $declarado ? $valor : null;
    }
    return null;
}

/** Valida los campos comunes de un producto o responde 400. */
function datosProducto(array $d): array
{
    $nombre = textoValido($d['nombre'] ?? null, 100);
    $descripcion = textoValido($d['descripcion'] ?? null, 2000, false);
    $color = textoValido($d['color'] ?? null, 50, false);
    $precio = filter_var($d['precio'] ?? null, FILTER_VALIDATE_FLOAT);
    $categoria = filter_var($d['categoriaID'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $imagen = imagenValida($d['imagen'] ?? null);

    if ($nombre === null || $descripcion === null || $color === null) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa los textos: nombre (máx. 100), descripción (máx. 2000) y color (máx. 50).'], 400);
    }
    if ($precio === false || $precio < 0.01 || $precio > 99999.99 || round($precio, 2) != $precio) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'El precio debe estar entre 0,01 y 99.999,99 € con dos decimales como máximo.'], 400);
    }
    if ($categoria === false) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa la categoría.'], 400);
    }
    if ($imagen === null) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Imagen no válida: usa JPG, PNG, WebP o GIF de hasta 1,5 MB.'], 400);
    }

    return [
        ':n' => $nombre,
        ':p' => $precio,
        ':d' => $descripcion !== '' ? $descripcion : null,
        ':c' => $categoria,
        ':i' => $imagen !== '' ? $imagen : null,
        ':co' => $color !== '' ? $color : null,
    ];
}

/**
 * Valida la lista de tallas de un producto o responde 400.
 * Cada talla llega como {id?: variante existente, talla, stock} y se devuelve
 * en el mismo orden, que es el que verá la clienta.
 */
function variantesProducto(array $d): array
{
    $lista = $d['variantes'] ?? null;
    if (!is_array($lista) || !array_is_list($lista) || count($lista) < 1 || count($lista) > 30) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Añade entre 1 y 30 tallas (usa "Única" si el producto no tiene tallas).'], 400);
    }

    $variantes = [];
    $vistas = [];
    foreach ($lista as $v) {
        $v = is_array($v) ? $v : [];
        $talla = textoValido($v['talla'] ?? null, 10);
        $stock = filter_var($v['stock'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 100000]]);
        $id = ($v['id'] ?? null) === null || ($v['id'] ?? '') === ''
            ? null
            : filter_var($v['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($talla === null || $stock === false || $id === false) {
            responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa las tallas: nombre de hasta 10 caracteres y stock de 0 a 100.000.'], 400);
        }
        $clave = mb_strtolower($talla);
        if (isset($vistas[$clave])) {
            responderJson(['resultado' => 'ERROR', 'mensaje' => "La talla \"$talla\" está repetida."], 400);
        }
        $vistas[$clave] = true;
        $variantes[] = ['id' => $id, 'talla' => $talla, 'stock' => $stock];
    }
    return $variantes;
}

/**
 * Deja las tallas del producto exactamente como en $variantes, dentro de la
 * transacción abierta: borra las que faltan, actualiza las existentes y crea las nuevas.
 *
 * @throws RuntimeException si una talla enviada no es de este producto.
 */
function guardarVariantes(PDO $pdo, int $productoId, array $variantes): void
{
    $actuales = $pdo->prepare('select id from public.producto_variantes where producto_id = :p for update');
    $actuales->execute([':p' => $productoId]);
    $existentes = array_map('intval', $actuales->fetchAll(PDO::FETCH_COLUMN));

    $conservar = array_values(array_filter(array_column($variantes, 'id')));
    if (array_diff($conservar, $existentes) !== []) {
        throw new RuntimeException('Una de las tallas no pertenece a este producto. Recarga la página.');
    }

    $borrar = $pdo->prepare('delete from public.producto_variantes where id = :id');
    foreach (array_diff($existentes, $conservar) as $id) {
        $borrar->execute([':id' => $id]);
    }

    $actualizar = $pdo->prepare(
        'update public.producto_variantes set talla = :t, stock = :s, orden = :o where id = :id and producto_id = :p'
    );
    $crear = $pdo->prepare(
        'insert into public.producto_variantes (producto_id, talla, stock, orden) values (:p, :t, :s, :o)'
    );
    foreach ($variantes as $orden => $v) {
        $valores = [':p' => $productoId, ':t' => $v['talla'], ':s' => $v['stock'], ':o' => $orden];
        if ($v['id'] !== null) {
            $actualizar->execute($valores + [':id' => $v['id']]);
        } else {
            $crear->execute($valores);
        }
    }
}
