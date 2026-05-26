## Causa raiz

A RPC `list_judit_credentials` retorna `400 - column reference "id" is ambiguous`. Os nomes dos parâmetros OUT (`id`, `system_name`, `customer_key`) colidem com as colunas de mesmo nome em `credenciais_judit` dentro do `RETURN QUERY`. Por isso o dropdown fica vazio — a query falha antes de devolver linhas.

Sem isso resolvido, **não adianta cadastrar nada novo no super-admin**: as 12+ credenciais ativas do Solvenza já existem no banco; o problema é só a função quebrada.

## Correção

Migration para recriar a função usando nomes OUT distintos e qualificando o `select`:

```sql
drop function if exists public.list_judit_credentials(uuid);

create or replace function public.list_judit_credentials(p_tenant_id uuid)
returns table(credencial_id uuid, system_name text, customer_key text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not (
    is_super_admin(auth.uid())
    or exists (
      select 1 from auth.users u
      where u.id = auth.uid()
        and lower(u.email) = 'danieldemorais.e@gmail.com'
    )
  ) then
    return;
  end if;

  return query
    select c.id as credencial_id, c.system_name, c.customer_key
    from public.credenciais_judit c
    where c.tenant_id = p_tenant_id and c.status = 'active'
    order by c.system_name;
end;
$$;

grant execute on function public.list_judit_credentials(uuid) to authenticated;
```

E atualizar o hook + consumidor para mapear `credencial_id → id`:

- `src/hooks/useJuditSystemNames.ts`: mapear o resultado do rpc para `{ id: row.credencial_id, system_name, customer_key }` mantendo a interface `JuditCredencial` igual.

Não é necessário tocar em `ProcessoOABDetalhes.tsx`.

## Arquivos afetados
- Nova migration SQL
- `src/hooks/useJuditSystemNames.ts`

## Impacto
- **Usuário final (Daniel):** o dropdown passa a listar imediatamente as credenciais ativas do tenant Solvenza (EPROC TJSP/TJRS/TJSC/TRF4, PJE TJMG/TJRO, PROJUDI TJPR, etc.) + "Público (sem credencial)". Nada precisa ser recadastrado no super-admin.
- **Dados:** Sem mudança de schema/dados. Só recria a função.
- **Riscos colaterais:** Gate continua restrito a super admins e Daniel. Hook só muda mapeamento interno — componentes que usam `JuditCredencial.id` continuam funcionando.
- **Quem é afetado:** Apenas Daniel (Solvenza). Demais usuários inalterados.

## Validação
1. Pós-migration: requisição da RPC retorna 200 e >0 linhas para Daniel no tenant Solvenza.
2. UI: abrir processo Solvenza → desativar monitoramento → "Editar" → dropdown lista as credenciais existentes.
3. Selecionar uma e salvar → registro persiste em `processos_oab.judit_system_name` / `judit_customer_key`.
