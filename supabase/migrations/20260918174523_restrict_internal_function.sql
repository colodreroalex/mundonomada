-- El disparador interno de RLS no debe ser invocable por roles de la API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
