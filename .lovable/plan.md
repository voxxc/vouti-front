# Banco de IDs — corrigir contagens zeradas e cap de 1000

## Causa raiz

Dois bugs distintos na mesma tela (`TenantBancoIdsDialog`):

1. **Histórico travado em 1000**: o select usa `.limit(2000)`, mas o PostgREST do Supabase aplica um teto de servidor (`db-max-rows = 1000`) que sobrepõe qualquer `.limit()` maior. SOLVENZA tem **14.623** registros em `tenant_banco_ids`; a tela mostra só 1.000.

2. **Processos / Requests / Trackings zerados** (mesmo SOLVENZA tendo 382 processos e 504 entradas tipo `processo` no banco de IDs): essas abas leem direto de `processos_oab`, cuja RLS exige `has_role_in_tenant()`. O usuário Super-Admin **não tem** esse papel nos tenants do cliente, então o select volta vazio silenciosamente. O banco já tem a fonte de verdade espelhada em `tenant_banco_ids` (tipos `processo`, `request_detalhes`, `tracking`, `tracking_desativado`, `request_tracking`, `oab`).

## Correção

1. Criar RPC `get_tenant_banco_ids_completo(p_tenant_id uuid)` `SECURITY DEFINER`, restrita a `is_super_admin(auth.uid())`, retornando todas as linhas de `tenant_banco_ids` do tenant (sem cap de 1000, pois o limite só vale para PostgREST direto — chamadas RPC paginadas via `fetchAllPaginated` resolvem por completo).
2. Refatorar `TenantBancoIdsDialog.tsx` para:
   - Buscar tudo via `fetchAllPaginated` sobre `tenant_banco_ids` (com `hardCap: 200` para cobrir tenants grandes).
   - Derivar as abas Processos / Requests CNJ / Trackings / OABs a partir dos registros em memória, agrupando por `referencia_id` quando aplicável. Manter aba Histórico como a lista bruta.
   - Remover a dependência de `processos_oab` e `oabs_cadastradas` (RLS-blocked). Os dados visíveis ao Super-Admin passam a vir 100% de `tenant_banco_ids`.
3. Ajustar o PDF para iterar sobre os registros agrupados.

## Arquivos afetados

- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` (refatoração)
- Nova migration: função `get_tenant_banco_ids_completo` (não estritamente necessária se `tenant_banco_ids` já tem policy permissiva para super-admin — confirmar; se sim, basta paginar).

## Impacto

1. **UX**: contadores passam a refletir a realidade (Processos ~504, Requests ~403, Trackings 356 ativos + 15 desativados, Histórico 14.623 para SOLVENZA). Busca passa a varrer tudo.
2. **Dados**: nenhuma alteração de schema; só leitura paginada. Pequena migration apenas se a RLS de `tenant_banco_ids` exigir RPC.
3. **Riscos colaterais**: tempo de carregamento sobe (~14k linhas em SOLVENZA → 15 páginas de 1k). Mitigado por: (a) carregamento único ao abrir o diálogo, (b) ScrollArea já virtualizada, (c) busca client-side instantânea depois de carregar.
4. **Quem é afetado**: apenas o Super-Admin (dono do SaaS). Nada muda para clientes finais.

## Validação

- Reabrir o diálogo na SOLVENZA: confirmar contadores ≈ 504 / 403 / 356 / 14623.
- Buscar por um `request_id` antigo (>1000 posições atrás) e confirmar que aparece.
- Conferir Vargas / Oliveira (tenants menores) para ver que não há regressão.
- Gerar PDF e verificar que lista todos os processos, não só os 1000 primeiros.
# Banco de IDs completo — Request IDs (CNJ) e Tracking IDs

## Causa raiz
O diálogo "Banco de IDs" lê apenas a tabela de auditoria `tenant_banco_ids`, que registra **eventos** (POSTs feitos, ativações, desativações). Isso faz com que a aba apareça "incompleta" porque:

1. Processos antigos importados antes do trigger `registrar_banco_id_processo` existir não têm registro de `request_detalhes`/`tracking` no banco de IDs (ex.: 9 processos da Solvenza, 2 da Oliveira hoje).
2. A lista atual mistura buscas, detalhes e trackings antigos em ordem cronológica — fica difícil ver "qual o request_id atual deste CNJ" ou "qual o tracking_id ativo deste processo".
3. A fonte de verdade real é a própria tabela `processos_oab` (`detalhes_request_id`, `tracking_id`, `tracking_request_id`, `monitoramento_ativo`).

## Correção

### 1. Backfill no banco
Migration que percorre `processos_oab` e insere em `tenant_banco_ids` qualquer `detalhes_request_id`, `tracking_id` ou `tracking_request_id` que ainda não esteja lá. Usa `ON CONFLICT DO NOTHING` (já há índice único por tenant+tipo+external_id).

### 2. Garantir captura futura
Os triggers `registrar_banco_id_processo` (INSERT/UPDATE) já gravam:
- `request_detalhes` quando `detalhes_request_id` muda
- `tracking` quando `tracking_id` muda
- `request_tracking` quando `tracking_request_id` muda
- `tracking_desativado` quando monitoramento é desligado

Vamos **revisar a edge function `judit-buscar-processo-cnj`** para garantir que toda importação por CNJ salve `detalhes_request_id` no INSERT (hoje já faz — confirmar) e que `judit-ativar-monitoramento` sempre escreva `tracking_id` + `tracking_request_id` no UPDATE (já faz).

### 3. Redesign do diálogo "Banco de IDs"
Substituir as abas atuais por uma estrutura mais útil baseada na fonte de verdade:

```text
Banco de IDs — [Tenant]
┌─────────────────────────────────────────────────────────┐
│ [Visão por processo] [Requests CNJ] [Trackings] [OABs] [Histórico] │
└─────────────────────────────────────────────────────────┘
```

- **Visão por processo** (nova, padrão): linha por CNJ com `request_id` de importação + `tracking_id` (badge ativo/inativo) + data. Lida direto de `processos_oab`. Copy-to-clipboard em cada coluna. Busca por CNJ ou ID.
- **Requests CNJ**: todos os `detalhes_request_id` por CNJ — fonte: `processos_oab`, garantindo 100% de cobertura. Exporta PDF.
- **Trackings**: todos os `tracking_id` ativos + histórico de desativados. Marcador de status ativo (cruzando `monitoramento_ativo`).
- **OABs**: como hoje.
- **Histórico**: o que está em `tenant_banco_ids` (para auditoria de eventos), com filtro por tipo.

### 4. Exportação
Botão "Baixar relatório completo" gera PDF com todas as 3 listas (CNJ→request_id, CNJ→tracking_id, OABs).

## Arquivos afetados
- `supabase/migrations/{novo}.sql` — backfill `tenant_banco_ids` a partir de `processos_oab`.
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — redesign das abas e nova "Visão por processo".
- `src/hooks/useTenantBancoIds.ts` (novo, opcional) — consolida queries em `processos_oab` + `tenant_banco_ids`.

Nenhuma mudança nas edge functions (já registram corretamente daqui pra frente).

## Impacto
- **Usuário final (Super-Admin)**: passa a ver o "Banco de IDs" como um inventário organizado por processo, não como um log cronológico confuso. Encontra o request_id de qualquer CNJ importado em 1 clique e vê quais processos estão monitorados com seus tracking_ids.
- **Dados**: backfill insere algumas dezenas de linhas em `tenant_banco_ids` (≈11 processos no total entre Solvenza e Oliveira). Sem alteração de RLS nem schema. Performance da listagem melhora porque a consulta principal passa a vir de `processos_oab` (já indexada) em vez de varrer eventos.
- **Riscos colaterais**: nenhum — a tabela `tenant_banco_ids` continua intacta como log de auditoria; só ganha registros faltantes.
- **Quem é afetado**: apenas o Super-Admin (login suporte@vouti.co e super_admins). Clientes finais não veem nada disso.

## Validação
1. Após backfill, rodar query comparando `processos_oab.detalhes_request_id` com `tenant_banco_ids` — deve retornar zero faltantes para todos os tenants.
2. Importar um novo CNJ em qualquer tenant → o request_id deve aparecer na aba "Requests CNJ" imediatamente.
3. Ativar monitoramento de um processo → tracking_id deve aparecer na aba "Trackings" como ativo.
4. Desativar monitoramento → tracking_id muda para inativo na mesma aba.
5. Exportar PDF e conferir contagens.
