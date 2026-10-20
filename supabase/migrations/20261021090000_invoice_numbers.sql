-- Numeración de facturas simplificadas: serie anual correlativa y sin huecos.
-- El número se asigna en la misma transacción en la que el webhook de Stripe
-- marca el pedido como pagado; si esa transacción falla, el contador no avanza.

create table public.invoice_counters (
  year integer primary key,
  last_number integer not null default 0 check (last_number >= 0)
);

alter table public.orders
  add column invoice_number varchar(20) unique,
  add column invoice_date timestamptz;

alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;
grant select, insert, update on public.invoice_counters to mundo_nomada_app;
create policy backend_invoice_counters on public.invoice_counters
  for all to mundo_nomada_app using (true) with check (true);

-- Facturas para los pedidos ya cobrados, por orden de pago
do $$
declare
  pedido record;
  siguiente integer;
begin
  for pedido in
    select id, coalesce(paid_at, fecha) as cobrado
      from public.orders
     where estado in ('pagado', 'enviado', 'completado') and invoice_number is null
     order by coalesce(paid_at, fecha), id
  loop
    insert into public.invoice_counters (year, last_number)
    values (extract(year from pedido.cobrado)::integer, 1)
    on conflict (year) do update set last_number = public.invoice_counters.last_number + 1
    returning last_number into siguiente;

    update public.orders
       set invoice_number = 'F' || extract(year from pedido.cobrado)::integer || '-' || lpad(siguiente::text, 6, '0'),
           invoice_date = pedido.cobrado
     where id = pedido.id;
  end loop;
end $$;
