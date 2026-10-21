-- Solo para el entorno de prueba. No son artículos reales a la venta.
insert into public.categorias (nombre, descripcion)
values ('Demostración', 'Catálogo ficticio para verificar el despliegue.')
on conflict (nombre) do nothing;

insert into public.productos (nombre, precio, descripcion, categoria_id, imagen_url, color)
select d.nombre, d.precio, 'Artículo ficticio de prueba. No está a la venta.', c.id, '/img/sin-imagen.png', d.color
from public.categorias c
cross join (values
  ('Blusa de prueba', 24.90, 'Blanco'),
  ('Bolso de prueba', 19.90, 'Beige'),
  ('Pañuelo de prueba', 9.90, 'Azul')
) as d(nombre, precio, color)
where c.nombre = 'Demostración'
and not exists (select 1 from public.productos p where p.nombre = d.nombre and p.categoria_id = c.id);

-- Tallas con su stock (la blusa tiene varias; los complementos, talla única)
insert into public.producto_variantes (producto_id, talla, stock, orden)
select p.id, t.talla, t.stock, t.orden
from public.productos p
join (values
  ('Blusa de prueba', 'S', 4, 0),
  ('Blusa de prueba', 'M', 10, 1),
  ('Blusa de prueba', 'L', 0, 2),
  ('Bolso de prueba', 'Única', 5, 0),
  ('Pañuelo de prueba', 'Única', 0, 0)
) as t(nombre, talla, stock, orden) on t.nombre = p.nombre
on conflict (producto_id, talla) do nothing;
