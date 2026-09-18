-- Runtime exclusivo de PHP. La contraseña se provisiona fuera de Git.
-- No tiene DDL, bypass de RLS ni acceso a los esquemas de Auth/Storage.
create role mundo_nomada_app login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant connect on database postgres to mundo_nomada_app;
grant usage on schema public, app_private to mundo_nomada_app;
grant execute on function app_private.set_updated_at() to mundo_nomada_app;
grant select, insert, update, delete on public.users, public.categorias,
  public.productos, public.carrito, public.login_attempts to mundo_nomada_app;
grant select on public.orders, public.order_items to mundo_nomada_app;
grant usage, select on sequence public.users_id_seq, public.categorias_id_seq,
  public.productos_id_seq, public.carrito_id_seq to mundo_nomada_app;

-- El backend autentica sesiones PHP y comprueba permisos/propiedad.
-- Estos permisos solo se aplican al rol privado del backend, nunca anon/authenticated.
create policy backend_users on public.users to mundo_nomada_app using (true) with check (true);
create policy backend_categorias on public.categorias to mundo_nomada_app using (true) with check (true);
create policy backend_productos on public.productos to mundo_nomada_app using (true) with check (true);
create policy backend_carrito on public.carrito to mundo_nomada_app using (true) with check (true);
create policy backend_login_attempts on public.login_attempts to mundo_nomada_app using (true) with check (true);
create policy backend_orders_read on public.orders for select to mundo_nomada_app using (true);
create policy backend_order_items_read on public.order_items for select to mundo_nomada_app using (true);
