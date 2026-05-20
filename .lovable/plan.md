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
