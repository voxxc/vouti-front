## Causa raiz

O dropdown "Credencial Judit" do drawer (modo edição, só visível ao Daniel) está vazio porque `useJuditSystemNames` faz `SELECT` direto em `credenciais_judit`, e a tabela só tem política de SELECT para **super admins**:

```
SELECT → is_super_admin(auth.uid())
```

Daniel (`danieldemorais.e@gmail.com`) **não é super admin**, então a lista vem vazia — apesar do tenant Solvenza ter várias credenciais ativas (EPROC TJSP/TJRS/TJSC/TRF4, PJE TJMG, PROJUDI TJPR, …).

## Correção

Criar uma RPC `SECURITY DEFINER` que retorna as credenciais ativas do tenant **apenas para super admins ou para o email do Daniel** (gate idêntico ao da UI de edição). Não abre RLS da tabela para todos os membros (o `customer_key` é sensível).

1. **Migration** — nova função:
   ```sql
   create or replace function public.list_judit_credentials(p_tenant_id uuid)
   returns table(id uuid, system_name text, customer_key text)
   language plpgsql stable security definer set search_path = public
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
   ```

2. **Hook** `src/hooks/useJuditSystemNames.ts` — trocar o `.from('credenciais_judit').select(...)` por `supabase.rpc('list_judit_credentials', { p_tenant_id: tenantId })`. Mesmo shape de retorno (`{id, system_name, customer_key}`), o dropdown no `ProcessoOABDetalhes` popula automaticamente.

## Arquivos afetados
- `supabase/migrations/<novo>.sql`
- `src/hooks/useJuditSystemNames.ts`

## Impacto
- **Usuário final:** Só Daniel vê o botão "Editar" (gate já existente) **e** agora também vê o dropdown populado com as credenciais ativas + "Público (sem credencial)". Fluxo: desativa monitoramento → edita → escolhe credencial → reativa → novo tracking criado com o `customer_key` correto.
- **Dados:** Sem mudança de schema. Apenas adiciona uma função no banco.
- **Riscos colaterais:** `customer_key` continua oculto via RLS direta. A RPC só libera leitura para super admins e Daniel — alinhado 1:1 com o gate visual de edição. Nenhum outro usuário (nem admins de tenant) recebe acesso novo.
- **Quem é afetado:** Apenas Daniel (Solvenza). Demais usuários inalterados.

## Validação
1. Pós-migration: autenticado como Daniel, `select public.list_judit_credentials('<tenant_solvenza>')` retorna >0 linhas.
2. UI (Daniel): abrir processo Solvenza, desativar monitoramento, clicar "Editar" — select lista as credenciais ativas + "Público".
3. Como qualquer outro usuário: nem o botão "Editar" aparece, e a RPC retorna vazio (sem regressão de segurança).
