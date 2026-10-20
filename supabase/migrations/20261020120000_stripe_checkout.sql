-- Checkout con Stripe. El backend crea el pedido "pendiente" y reserva stock;
-- solo el webhook verificado de Stripe lo marca como "pagado" o lo cancela.

alter table public.orders
  add column subtotal numeric(10,2) check (subtotal >= 0),
  add column iva numeric(10,2) check (iva >= 0),
  add column envio numeric(10,2) check (envio >= 0),
  add column shipping_email varchar(254),
  add column shipping_postal_code varchar(10),
  add column shipping_city varchar(100),
  add column shipping_province varchar(100),
  add column payment_intent varchar(191),
  add column paid_at timestamptz,
  add column updated_at timestamptz not null default now();

create index orders_estado_fecha_idx on public.orders(estado, fecha desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function app_private.set_updated_at();

grant insert, update on public.orders to mundo_nomada_app;
grant insert on public.order_items to mundo_nomada_app;
grant usage, select on sequence public.orders_id_seq, public.order_items_id_seq to mundo_nomada_app;

drop policy backend_orders_read on public.orders;
drop policy backend_order_items_read on public.order_items;
create policy backend_orders on public.orders for all to mundo_nomada_app using (true) with check (true);
create policy backend_order_items on public.order_items for all to mundo_nomada_app using (true) with check (true);
