<?php
declare(strict_types=1);

/*
 * Consulta común del catálogo: cada producto con sus tallas y el stock total.
 * No es accesible desde la web (bloqueado en apache-site.conf).
 */
require_once __DIR__ . '/../conexion_postgres.php';

/**
 * Devuelve los productos que cumplen $filtro (SQL sobre el alias p) con:
 *  - stock: suma del stock de todas sus tallas
 *  - variantes: [{id, talla, stock}] en el orden definido en administración
 */
function consultarProductos(string $filtro = 'true', array $parametros = []): array
{
    $consulta = retornarConexionPostgres()->prepare(
        "select p.id as \"ProductoID\", p.nombre, p.precio, p.descripcion,
                p.categoria_id as \"categoriaID\", p.imagen_url as imagen, p.color,
                coalesce((select sum(v.stock) from public.producto_variantes v where v.producto_id = p.id), 0)::integer as stock,
                coalesce((select json_agg(json_build_object('id', v.id, 'talla', v.talla, 'stock', v.stock) order by v.orden, v.id)
                            from public.producto_variantes v where v.producto_id = p.id), '[]') as variantes
           from public.productos p
          where $filtro
          order by p.id"
    );
    $consulta->execute($parametros);

    return array_map(static function (array $producto): array {
        $producto['variantes'] = json_decode((string) $producto['variantes'], true) ?: [];
        return $producto;
    }, $consulta->fetchAll());
}
