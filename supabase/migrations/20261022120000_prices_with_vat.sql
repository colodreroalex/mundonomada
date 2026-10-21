-- Precios con IVA incluido (PVP), como en cualquier tienda online para consumidores.
-- Hasta ahora productos.precio se guardaba sin IVA y la web sumaba el 21 % al pagar.
-- A partir de aquí productos.precio es el precio final que ve y paga la clienta.
--
-- Los pedidos ya hechos no cambian: se marcan con precios_con_iva = false para que
-- sus facturas se sigan calculando como entonces (líneas sin IVA).

-- Pedidos: cómo están guardados los precios de sus líneas
alter table public.orders
  add column precios_con_iva boolean not null default false;

-- Catálogo: precio sin IVA → precio final con IVA, redondeado al céntimo
update public.productos
   set precio = round(precio * 1.21, 2);
