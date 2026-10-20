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

/** Valida los campos de un producto o responde 400. */
function datosProducto(array $d): array
{
    $nombre = textoValido($d['nombre'] ?? null, 100);
    $descripcion = textoValido($d['descripcion'] ?? null, 2000, false);
    $color = textoValido($d['color'] ?? null, 50, false);
    $talla = textoValido($d['talla'] ?? null, 10, false);
    $precio = filter_var($d['precio'] ?? null, FILTER_VALIDATE_FLOAT);
    $stock = filter_var($d['stock'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 100000]]);
    $categoria = filter_var($d['categoriaID'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $imagen = imagenValida($d['imagen'] ?? null);

    if ($nombre === null || $descripcion === null || $color === null || $talla === null) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa los textos: nombre (máx. 100), descripción (máx. 2000), color (máx. 50) y talla (máx. 10).'], 400);
    }
    if ($precio === false || $precio < 0.01 || $precio > 99999.99 || round($precio, 2) != $precio) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'El precio debe estar entre 0,01 y 99.999,99 € con dos decimales como máximo.'], 400);
    }
    if ($stock === false || $categoria === false) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Revisa el stock (0 a 100.000) y la categoría.'], 400);
    }
    if ($imagen === null) {
        responderJson(['resultado' => 'ERROR', 'mensaje' => 'Imagen no válida: usa JPG, PNG, WebP o GIF de hasta 1,5 MB.'], 400);
    }

    return [
        ':n' => $nombre,
        ':p' => $precio,
        ':d' => $descripcion !== '' ? $descripcion : null,
        ':s' => $stock,
        ':c' => $categoria,
        ':i' => $imagen !== '' ? $imagen : null,
        ':co' => $color !== '' ? $color : null,
        ':t' => $talla !== '' ? $talla : null,
    ];
}
