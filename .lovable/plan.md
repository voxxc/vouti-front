# Oficializar drawer com anexos + migrar trackings para receber arquivos

## Causa raiz

1. **Visual**: o drawer `ProcessoOABDetalhes` já tem o novo padrão (cards de andamento com `AndamentoAnexos` + `useProcessoAnexos`). `ProcessoCNPJDetalhes` e drawers irmãos (`MovimentacoesDrawer`, `AndamentosDrawer`) mostram andamentos sem o bloco de anexos.
2. **Tracking Judit**: `judit-ativar-monitoramento` (CNPJ) já cria tracking com `with_attachments: true`, mas `judit-ativar-monitoramento-oab` **não envia o flag**. Trackings OAB antigos nunca receberam anexos, e a Judit não permite alterar flags em tracking existente — só `pause` + novo `create`.
3. **Importação**: chamadas de **import/busca de processo** (não-monitoramento) podem estar enviando `with_attachments` em algum ponto, o que é desperdício de cota. Anexo só deve existir no fluxo de monitoramento.

## Princípio (regra dura)

> **`with_attachments: true` SOMENTE em criação/recriação de tracking de monitoramento. Em qualquer rota de importação, busca avulsa, requests on-demand ou refresh sob demanda → `with_attachments: false` (ou flag omitido).**

## Correção

### Parte 1 — Padronizar o visual (frontend)

- Extrair `AndamentoCard` reutilizável a partir do trecho atual em `ProcessoOABDetalhes` (header do andamento + `<AndamentoAnexos />`).
- Aplicar em `ProcessoCNPJDetalhes`, `MovimentacoesDrawer`, `AndamentosDrawer`, `MovimentacaoCard`.
- `useProcessoAnexos(processo.id)` agrupa anexos por `step_id` igual ao OAB.

### Parte 2 — Garantir attachments só no monitoramento (backend)

- Auditar e ajustar para **não** enviar `with_attachments`:
  - `judit-buscar-detalhes-processo`
  - `judit-importar-processo` / `importar-processo-cnj` / qualquer função de import em massa
  - Buscas on-demand do `AtualizadorAndamentos` / `BuscarAndamentosPJE` / `BuscarPorOABTab`
- Corrigir `judit-ativar-monitoramento-oab` para passar `with_attachments: true` na criação do tracking.
- Confirmar `judit-ativar-monitoramento` (CNPJ) já correto.

### Parte 3 — Migrar trackings existentes

Nova edge function `judit-migrar-trackings-attachments`:

1. Paginar `processos_oab` (e CNPJ se algum nasceu sem flag) com `monitoramento_ativo = true` e `tracking_id IS NOT NULL` e `with_attachments = false`.
2. Para cada processo, em ordem segura:
   a. `POST /tracking` novo com `with_attachments: true` (+ credencial quando houver) → obter novo `tracking_id`.
   b. `POST /tracking/{tracking_id_antigo}/pause`.
   c. Atualizar `tracking_id`, `tracking_request_id`, `tracking_request_data`, `with_attachments = true`.
   d. Log em `judit_logs` (`tipo_chamada: 'migracao_attachments'`) e registro em `judit_migracao_attachments`.
3. Lotes pequenos (ex.: 25 por execução), cursor persistido, com retry e rate-limit.

### Parte 4 — UI de acionamento

- Nova aba **"Migração de Anexos"** em Controladoria, visível só para `admin`/`controller`:
  - KPIs: ativos, migrados, pendentes, com erro.
  - Botão "Migrar próximo lote".
  - Tabela com status por processo + mensagem de erro.
  - Histórico das últimas execuções.

## Arquivos afetados

**Frontend**
- `src/components/Controladoria/AndamentoCard.tsx` *(novo)*
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` *(usa o card extraído)*
- `src/components/Controladoria/ProcessoCNPJDetalhes.tsx` *(adota card + hook)*
- `src/components/Controladoria/MovimentacoesDrawer.tsx`, `AndamentosDrawer.tsx`, `MovimentacaoCard.tsx`
- `src/components/Controladoria/MigracaoAnexosTab.tsx` *(novo)*
- `src/pages/Controladoria.tsx` *(adiciona aba)*
- `src/hooks/useMigracaoAnexos.ts` *(novo)*

**Backend**
- `supabase/functions/judit-ativar-monitoramento-oab/index.ts` *(adicionar `with_attachments: true`)*
- `supabase/functions/judit-buscar-detalhes-processo/index.ts` *(remover `with_attachments` se existir)*
- Demais funções de import/busca avulsa: garantir ausência do flag.
- `supabase/functions/judit-migrar-trackings-attachments/index.ts` *(novo)*

**Banco**
- Tabela `judit_migracao_attachments` (processo_id, tipo, tracking_id_antigo, tracking_id_novo, status, erro, executado_em) com RLS admin-only.
- Coluna `with_attachments boolean default false` em `processos_oab` e `processos_cnpj` para idempotência e auditoria.

## Impacto

**Usuário final (UX)**
- Drawer de qualquer caso/processo judicial (OAB e CNPJ) passa a mostrar andamentos com anexos inline + download direto — fim da inconsistência visual.
- Admins ganham aba dedicada para migrar trackings e acompanhar status; não dependem mais do super-admin.
- Toda nova movimentação de processo **monitorado** já chega com PDFs/anexos. Importações continuam rápidas e baratas, sem anexo (comportamento esperado).

**Dados**
- Cada tracking migrado consome 1 CREATE + 1 PAUSE na Judit → custo por processo. Migrar em lotes para controlar gasto.
- `tracking_id` muda nos registros migrados — qualquer integração que dependa do ID antigo precisa ser tolerante.
- Histórico de andamentos antigos **não** ganha anexos retroativos (Judit só envia anexos das movimentações capturadas pelo tracking ativo no momento). Só movimentações futuras terão arquivos.
- Nova tabela de auditoria + 1 coluna por processo; RLS dos processos não muda.

**Riscos colaterais**
- Pequena janela entre CREATE novo e PAUSE antigo onde a Judit pode duplicar uma movimentação — dedupe atual por `step_id`/`message_id` já cobre.
- Se a Judit recusar o novo tracking (credencial expirada, processo arquivado), o monitoramento daquele processo fica desativado — precisa aparecer destacado na tabela.
- Esquecer de remover o flag em alguma rota de importação geraria custo desnecessário — por isso a auditoria explícita na Parte 2.

**Quem é afetado**
- **Todos os tenants** com monitoramento OAB ativo (CNPJ já nasce certo).
- **Admins/controllers**: nova aba e responsabilidade de disparar a migração.
- **Advogados**: ganham anexos diretos no drawer, sem mudar fluxo.

## Validação

1. Conferir paridade visual: abrir um processo CNPJ com anexos conhecidos e comparar com OAB.
2. Grep final por `with_attachments` em `supabase/functions/` — deve aparecer **apenas** nas duas funções de ativação de monitoramento.
3. Tenant piloto (demorais): rodar migração em 5 processos OAB → conferir novo `tracking_id`, antigo pausado, `judit_logs` com CREATE + PAUSE, próxima movimentação real chega com `processos_oab_anexos`.
4. Ativar manualmente um novo monitoramento OAB → confirmar `with_attachments` no payload.
5. Importar um processo novo (não-monitorado) → confirmar zero chamada com `with_attachments`.
6. Stress test com lote de 100, medir tempo e ajustar batch.
