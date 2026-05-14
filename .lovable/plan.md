
# Atualizar Andamentos com reset + registro de IDs no Super-Admin

## Causa raiz / Comportamento atual

1. Botão **🔄 Atualizar andamentos** em `ProcessoOABDetalhes.tsx` (linha 949) chama `onConsultarDetalhesRequest`, que em `useAllProcessosOAB.ts` é **no-op**. Não força nova consulta.
2. `judit-buscar-detalhes-processo` prefere cache (request_id existente, tracking_id, processo compartilhado). Não dá pra ressincronizar processos travados pela UI.
3. Hoje **não há registro consolidado** no Super-Admin de "quando foi feito o último POST de reset, qual request_id retornou, qual tracking_id passou a valer". Existe `tenant_banco_ids` (com tipos `request_detalhes`, `tracking`, `tracking_desativado`) e `judit_api_logs`, mas a operação de reset que vamos criar precisa popular ambos.

## Correção / O que vai passar a acontecer

### Botão na Controladoria (UX)

Botão **🔄 Atualizar andamentos** abre `AlertDialog` de confirmação e dispara nova Edge Function `judit-resetar-processo` que executa em sequência:

1. **Desativa monitoramento atual** (se ativo): `PATCH /tracking/:id status=paused` na Judit + zera `processos_oab.monitoramento_ativo`, `tracking_id`, `tracking_request_id` e `processo_monitoramento_judit.monitoramento_ativo`. Linha de monitoramento fica preservada.
2. **Força POST novo** na Judit (`POST /requests` com `search_type=lawsuit_cnj`, `on_demand=true`), **ignorando todos os caches**. Usa credencial sigilosa do tenant se houver.
3. **Polling** do novo `request_id` até completar (mesma lógica de `judit-buscar-detalhes-processo`).
4. **Insere apenas o que é novo** — não apaga nada:
   - Lê `MAX(data_movimentacao)` em `processos_oab_andamentos` para o processo (ex: `17/04/2026` no print).
   - Calcula `andamento_key = generateAndamentoKey(data, descricao)` para cada andamento da resposta.
   - Compara com as `andamento_key` existentes; **insere só os ausentes** com `data_movimentacao >= MAX existente`.
   - Antigos ficam intocados (lida/não-lida preservado). Novos entram com `lida=false`.
   - Evita inflar a Central da Controladoria.
5. **Atualiza** `processos_oab` com novo `detalhes_request_id`, `detalhes_request_data = now()` e campos de cabeçalho **só se vierem preenchidos**.
6. Toast: `"X novos andamentos. Monitoramento desativado — reative para retomar."` (`X=0` → `"Nenhuma novidade desde DD/MM."`)

### Registro no Super-Admin (NOVO — foco desta iteração)

Tudo o que a `judit-resetar-processo` faz é gravado em **dois lugares já existentes**, sem criar tabela nova:

**A) `judit_api_logs`** — registro detalhado por chamada HTTP:
- `tipo_chamada='reset_processo_pause'` para o PATCH de pause (com `request_payload`, `response_payload`, `tracking_id` antigo).
- `tipo_chamada='reset_processo_post'` para o POST novo (com `request_payload`, `response_payload`, `request_id` retornado, latência, `sucesso`).
- `tipo_chamada='reset_processo_polling'` opcionalmente para a última leitura do `/responses` (com count de andamentos, novos inseridos).
- Cada log carrega `tenant_id`, `oab_id`, `processo_id`, `user_id`, `created_at`. Já aparece em `TenantJuditLogsDialog.tsx`.

**B) `tenant_banco_ids`** — registro consolidado de IDs vivos do tenant (já é a "fonte de verdade" do dialog "Banco de IDs"):
- Insere `tipo='request_detalhes'` com `external_id = <novo request_id>`, `referencia_id = processo_oab_id`, `descricao = "Reset manual - CNJ <numero> - <data>"`, `metadata = { numero_cnj, processo_oab_id, request_id, post_em: <iso>, origem: 'reset_manual', usuario_id }`.
- Move o `tracking_id` antigo para `tipo='tracking_desativado'` (atualiza ou insere) com `metadata.desativado_em = <iso>` + `metadata.motivo = 'reset_manual'`.
- Quando o usuário **reativar** o monitoramento via Switch (fluxo padrão `judit-ativar-monitoramento`), uma linha `tipo='tracking'` nova é inserida com o novo `tracking_id` + `metadata = { tracking_id, ativado_em, request_id_origem, processo_oab_id }`. **Para isso, ajusto `judit-ativar-monitoramento` para também gravar em `tenant_banco_ids`** (hoje pode estar gravando incompleto — verificar e padronizar).

### O que o Super-Admin vê

No **TenantCard**, os 2 botões já existentes ganham dado novo automaticamente:

- **"Banco de IDs"** (`TenantBancoIdsDialog`) — abas `Detalhes`, `Monitoramento`, `Desativado` passam a mostrar:
  - **Detalhes (request_detalhes)**: cada reset cria uma linha — `CNJ • request_id • data do POST • origem (reset_manual / sync_automatico / monitoramento)`.
  - **Monitoramento (tracking)**: tracking ativo atual com `tracking_id • ativado_em • request_id_origem`.
  - **Desativado (tracking_desativado)**: histórico de trackings pausados com `tracking_id • desativado_em • motivo (reset_manual / desativacao_manual / falha)`.
  - Botão de copiar e exportação PDF já existem.
- **"Logs Judit"** (`TenantJuditLogsDialog`) — os 3 novos `tipo_chamada` (`reset_processo_*`) aparecem com label e ícone próprios. Adiciono mapping em `getTipoLabel` e `getTipoIcon` + filtro/contador no header.

Sem nenhuma tela nova. Tudo entra nos dialogs que o super-admin já usa.

## Arquivos afetados

**Edge Functions**
- `supabase/functions/judit-resetar-processo/index.ts` (novo) — orquestra pause + POST + polling + insert incremental + grava em `judit_api_logs` e `tenant_banco_ids`.
- `supabase/functions/judit-ativar-monitoramento/index.ts` (ajuste) — após criar tracking, garantir insert em `tenant_banco_ids` com `tipo='tracking'` e metadata completa (request_id_origem, ativado_em, processo_oab_id). Verificar que não duplica registros.
- `supabase/functions/judit-desativar-monitoramento/index.ts` (ajuste) — ao pausar, atualizar/inserir `tipo='tracking_desativado'` com motivo. Verificar idempotência.

**Front — Controladoria**
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — `handleRefreshAndamentos` abre `AlertDialog` e invoca `judit-resetar-processo`; ao final, recarrega andamentos e chama `onAtualizarProcesso` para refletir `monitoramento_ativo=false`. Botão sempre visível.
- `src/hooks/useAllProcessosOAB.ts` — método `resetarProcesso(processoId, numeroCnj)` que invoca a Edge Function e dá refetch.
- `src/hooks/useMonitoramentoJudit.ts` — adição equivalente para coerência.

**Front — Super-Admin**
- `src/components/SuperAdmin/TenantJuditLogsDialog.tsx` — adicionar `reset_processo_pause`, `reset_processo_post`, `reset_processo_polling` em:
  - `getTipoLabel` ("Reset - Pause", "Reset - POST", "Reset - Polling")
  - `getTipoIcon` (ícone `RotateCcw` da lucide-react)
  - Card de contadores no header (novo card "Resets manuais")
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — exibição já é genérica via `metadata`, mas:
  - Renderizar campos extras quando metadata tiver `post_em`, `origem`, `motivo`, `desativado_em`, `ativado_em`, `request_id_origem` (formatados com `format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })`).
  - Badge "Reset manual" quando `metadata.origem === 'reset_manual'` para destacar.

**Schema**
- Sem migration. `tenant_banco_ids` e `judit_api_logs` já têm colunas suficientes (`metadata jsonb`, `tipo`, `external_id`, `referencia_id`).

## Impacto

**1. Para o usuário final (UX, telas, fluxos)**
- **Controller / Advogado**: botão 🔄 da Controladoria passa a funcionar com confirmação. Lista mantém histórico, só novos andamentos aparecem como não lidos. Switch de monitoramento volta a "desativado" — usuário reativa quando quiser.
- **Super-Admin**: nos botões existentes do `TenantCard`:
  - "Banco de IDs" → mostra timeline completa de request_ids de detalhes (com data do POST), trackings ativos, trackings desativados — com motivo e data.
  - "Logs Judit" → 3 novas categorias visíveis (Reset Pause, Reset POST, Reset Polling) com contador no header. Permite auditar quem disparou reset, quando, e qual foi o resultado.
- Sem tela nova, sem rota nova.

**2. Para os dados (migrations, RLS, performance)**
- Zero migration.
- `judit_api_logs` ganha ~3 linhas por reset (uma para pause, uma para POST, opcionalmente uma para polling). Volume baixo — reset é ação manual.
- `tenant_banco_ids` ganha 1 linha `request_detalhes` por reset + atualização de `tracking_desativado`. UPSERT por `(tenant_id, tipo, external_id)` para evitar duplicatas — verificar se índice único existe; se não, fazer SELECT + INSERT/UPDATE no código.
- RLS já existente em ambas as tabelas (super_admin reads all, tenant_admin reads próprios).

**3. Riscos colaterais**
- **Race com `judit-sync-monitorados`**: setar `processos_oab.detalhes_request_data = now()` no início do reset; sync ignora processos com `detalhes_request_data < 5min`.
- **`LAWSUIT_NOT_FOUND`**: NÃO desativa monitoramento e NÃO move tracking para "desativado". Loga em `judit_api_logs` com `sucesso=false` e mostra toast de erro. Estado do banco fica intacto.
- **Duplicação em `tenant_banco_ids`**: se o usuário clicar reset 2x rápido, o segundo reset cria nova linha `request_detalhes` (intencional — registro histórico) mas não duplica `tracking_desativado` (UPSERT).
- **Custo Judit**: cada reset = 1 POST pago. Confirmação + cooldown de 30s no botão.
- **Ajustes em `judit-ativar/desativar-monitoramento`**: se já gravam em `tenant_banco_ids`, padronização pode quebrar leituras antigas. Mitigação: revisar código atual antes de mexer; se já gravam, só completar metadata sem mudar formato.

**4. Quem é afetado**
- **Controller / Admin / Advogado**: ganham botão funcional para destravar processos.
- **Super-Admin**: ganha rastreabilidade completa nos dialogs que já usa. Pode auditar todo reset (quem, quando, request_id retornado, tracking trocado).
- **Tenants em geral**: zero impacto cruzado (escopo por `tenant_id`).
- **Sincronização automática diária**: continua igual; após reativação manual, novo tracking entra na esteira.

## Validação

1. **Pré-teste no `5040965-07.2026.8.24.0930`**:
   ```sql
   SELECT id, tenant_id, monitoramento_ativo, tracking_id, detalhes_request_id, detalhes_request_data
   FROM processos_oab WHERE numero_cnj = '5040965-07.2026.8.24.0930';
   SELECT count(*), max(data_movimentacao) FROM processos_oab_andamentos WHERE processo_oab_id = '<id>';
   SELECT tipo, external_id, metadata FROM tenant_banco_ids
     WHERE tenant_id = '<tenant>' AND tipo IN ('tracking','tracking_desativado','request_detalhes')
     ORDER BY created_at DESC LIMIT 10;
   ```
2. **Deploy** das Edge Functions + ajustes do front.
3. **Teste manual reset**:
   - Controladoria → processo → 🔄 → confirmar.
   - Network: 1 chamada `judit-resetar-processo` com `success: true`, `andamentosNovos: N`.
   - Banco: `tracking_id=null`, `monitoramento_ativo=false`, novo `detalhes_request_id`.
   - Super-Admin → tenant card → "Logs Judit": 3 novas linhas (`reset_processo_pause`, `reset_processo_post`, `reset_processo_polling`).
   - Super-Admin → tenant card → "Banco de IDs": aba Detalhes mostra novo `request_detalhes` com `metadata.origem='reset_manual'` e `post_em`. Aba Desativado mostra tracking antigo com `motivo='reset_manual'`.
4. **Reativar** monitoramento pelo Switch:
   - Aba "Banco de IDs" → Monitoramento: aparece nova linha `tracking` com `tracking_id` + `ativado_em` + `request_id_origem`.
5. **Regressão Central**: contador de não lidos só sobe pelo `N` de novos andamentos (não pelo total).
6. **Rollback**: reverter front + Edge Function — banco fica íntegro (apenas INSERT/UPDATE idempotentes).
