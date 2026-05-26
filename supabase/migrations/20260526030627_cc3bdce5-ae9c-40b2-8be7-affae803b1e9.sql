create or replace function public.list_judit_credentials(p_tenant_id uuid)
returns table(id uuid, system_name text, customer_key text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    is_super_admin(auth.uid())
    or exists (
      select 1 from auth.users
      where id = auth.uid()
        and lower(email) = 'danieldemorais.e@gmail.com'
    )
  ) then
    return;
  end if;

  return query
    select c.id, c.system_name, c.customer_key
    from credenciais_judit c
    where c.tenant_id = p_tenant_id and c.status = 'active'
    order by c.system_name;
end;
$$;

grant execute on function public.list_judit_credentials(uuid) to authenticated;