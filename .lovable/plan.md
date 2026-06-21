## Causa raiz

O drawer **abriu** — o que não funcionou foi listar os processos. A consulta `processos_oab` com `eq('tenant_id', solvenzaId)` é executada no client com a sessão do super admin (Daniel). Como Daniel pertence ao tenant dele, as policies `tenant_select` (que comparam `tenant_id` ao tenant do usuário) bloqueiam tudo do Solvenza → retorna 0 registros, mostrando "Nenhum processo encontrado".

Não há policy de bypass para super admin nessas tabelas — e isso está correto, pois manter a isolação por RLS é a regra do projeto. A solução certa é buscar via **Edge Function com service role**, validando super admin no Bearer token (mesmo padrão já usado em `super-admin-criar-andamento-manual`).

## Correção

1. Estender `super-admin-criar-andamento-manual/index.ts` para aceitar uma ação de listagem (`action: 'list-processos'`) **OU** criar nova edge function `super-admin-listar-processos-oab`. Vou pelo segundo: função dedicada, mais simples e idempotente.

2. **Nova edge function** `super-admin-listar-processos-oab`:
   - Valida Bearer → confere `super_admins`.
   - Recebe `tenant_id` e (opcional) `busca`.
   - Usa service role para `select id, numero_cnj, parte_ativa, parte_passiva, tribunal_sigla` em `processos_oab` filtrando por `tenant_id`, ordenado por `numero_cnj`.
   - Pagina internamente (usar `fetchAllPaginated` no servidor com range manual de 1000 em 1000) para evitar limite implícito.
   - Retorna `{ processos: [...] }`.

3. **Ajustar `SuperAdminMovimentosManuaisDrawer.tsx`**:
   - Trocar a chamada direta `supabase.from('processos_oab').select(...)` por `supabase.functions.invoke('super-admin-listar-processos-oab', { body: { tenant_id } })`.
   - Manter o restante do componente (busca local, render, dialog selecionado).

## Arquivos afetados

- `supabase/functions/super-admin-listar-processos-oab/index.ts` (novo).
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` (substituir o `useEffect` que carrega processos).

## Impacto

- **UX**: ao clicar em "Movimentos manuais" no card do Solvenza (e qualquer outro tenant), a lista de processos do tenant alvo passa a carregar normalmente; o restante do fluxo (selecionar processo → dialog → criar andamento) já está funcionando.
- **Dados**: nenhuma migration. RLS de `processos_oab` permanece intacta — leitura cross-tenant ocorre apenas via service role autenticado como super admin.
- **Riscos colaterais**: baixos. A nova função expõe metadados básicos de processos (CNJ, partes, sigla) somente para super admins validados; mesmo nível de acesso já existente em outros endpoints super-admin.
- **Quem é afetado**: apenas super admins (Daniel). Tenants comuns continuam sem acesso a dados de outros tenants.

## Validação

1. Como super admin, abrir Solvenza → "Movimentos manuais" → lista deve mostrar todos os processos do Solvenza com CNJ + partes.
2. Busca local por CNJ/parte filtra corretamente.
3. Clicar em um processo → dialog abre → criar andamento manual → andamento aparece na Central de Não Lidos do tenant Solvenza.
4. Logar como usuário comum de outro tenant e tentar invocar `super-admin-listar-processos-oab` → recebe 403.
