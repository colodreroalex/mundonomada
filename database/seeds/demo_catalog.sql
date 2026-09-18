-- Solo para el entorno de prueba. No son artículos reales a la venta.
insert into public.categorias (nombre, descripcion)
values ('Demostración', 'Catálogo ficticio para verificar el despliegue.')
on conflict (nombre) do nothing;

insert into public.productos (nombre, precio, descripcion, stock, categoria_id, imagen_url, color, talla)
select d.nombre, d.precio, 'Artículo ficticio de prueba. No está a la venta.', d.stock, c.id, '/img/sin-imagen.png', d.color, d.talla
from public.categorias c
cross join (values
  ('Blusa de prueba', 24.90, 10, 'Blanco', 'M'),
  ('Bolso de prueba', 19.90, 5, 'Beige', 'Única'),
  ('Pañuelo de prueba', 9.90, 0, 'Azul', 'Única')
) as d(nombre, precio, stock, color, talla)
where c.nombre = 'Demostración'
and not exists (select 1 from public.productos p where p.nombre = d.nombre and p.categoria_id = c.id);
