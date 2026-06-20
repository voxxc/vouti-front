## Causa raiz

Hoje o toggle de monitoramento dos processos OAB (`useAllProcessosOAB.toggleMonitoramento` e `useOABs.toggleMonitoramento`) chama `judit-ativar-monitoramento-oab` tanto para ativar quanto para desativar. Isso amarra o produto à Judit, que está sendo descontinuada para esse fluxo. O Escavador já tem infraestrutura (`escavador-ativar-e-buscar`, `escavador-webhook`, `processo_monitoramento_escavador`, `processo_atualizacoes_escavador`), mas está apontada para a tabela legada `processos`, não para `processos_oab`.

## Correção

Manter Judit e Escavador em pistas separadas, conforme pedido:

1. **Nova tabela `processo_oab_monitoramento_escavador`** (espelha a estrutura da existente, mas com `processo_oab_id → processos_oab.id`, `tenant_id`, `numero_cnj`, `escavador_id`, `monitoramento_id` (callback Escavador), `frequencia` default `'semanal'`, `monitoramento_ativo`, contadores e timestamps). RLS por `tenant_id` + GRANTs.

2. **Nova edge function `escavador-ativar-monitoramento-oab`**:
   - Recebe `{ processoOabId, numeroCnj, tenantId }`.
   - Busca o processo no Escavador (mesma lógica de `escavador-ativar-e-buscar`).
   - Cria/atualiza monitoramento na API do Escavador apontando o webhook (`/functions/v1/escavador-webhook`) com frequência **semanal**.
   - Faz o GET inicial e popula `processos_oab_andamentos` (tabela existente do fluxo OAB) marcando como não-lidos.
   - Persiste `processo_oab_monitoramento_escavador` com `monitoramento_ativo = true`, `monitoramento_id` (id do callback Escavador), `ultima_consulta`.
   - Atualiza `processos_oab.monitoramento_ativo = true`.

3. **Nova edge function `escavador-desativar-monitoramento-oab`**:
   - Cancela o callback no Escavador via API.
   - Marca `processo_oab_monitoramento_escavador.monitoramento_ativo = false` (mantém histórico).
   - Atualiza `processos_oab.monitoramento_ativo = false`.

4. **Atualizar `escavador-webhook`** para também resolver o caminho OAB: se o payload casar em `processo_oab_monitoramento_escavador.escavador_id`, gravar andamentos em `processos_oab_andamentos` (não-lidos). Mantém o caminho legado intacto.

5. **Hooks de toggle (`useAllProcessosOAB`, `useOABs`)**:
   - **Ativar**: chamar `escavador-ativar-monitoramento-oab`.
   - **Desativar**: chamar (em paralelo) `judit-desativar-monitoramento` (já existe e remove o tracking da Judit) **e** `escavador-desativar-monitoramento-oab`. Tolerar falha do lado Judit (apenas logar) — o usuário já interrompeu a relação com Judit, então o objetivo é só limpar o que ainda existir lá.

6. **Secrets**: garantir `ESCAVADOR_API_TOKEN` e `ESCAVADOR_WEBHOOK_SECRET` (já existem, conferir). Nenhum novo secret previsto.

7. **UI**: nenhum redesign. Toasts passam a refletir Escavador (“Monitoramento semanal ativado via Escavador”, “Monitoramento desativado”). Mensagens de erro específicas de Judit (sigilo/credencial) deixam de aparecer no fluxo de ativação.

## Arquivos afetados

- `supabase/migrations/<nova>` — cria `processo_oab_monitoramento_escavador` (+ RLS + GRANTs).
- `supabase/functions/escavador-ativar-monitoramento-oab/index.ts` (novo).
- `supabase/functions/escavador-desativar-monitoramento-oab/index.ts` (novo).
- `supabase/functions/escavador-webhook/index.ts` (estende para OAB).
- `supabase/config.toml` — registrar as novas funções se necessário.
- `src/hooks/useAllProcessosOAB.ts` — `toggleMonitoramento` reescrito.
- `src/hooks/useOABs.ts` — `toggleMonitoramento` reescrito.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — remover dependência do bloco "Escavador beta" duplicado, manter apenas o toggle unificado; remover textos específicos de Judit no resumo.

Itens **não** alterados: `judit-desativar-monitoramento` (continua existindo, agora invocado pelo toggle off como cleanup), histórico Judit (`processos_oab_andamentos` originados de Judit), `processo_monitoramento_judit` (preservado para auditoria).

## Impacto

**Usuário final (UX/fluxos)**
- O toggle "Monitoramento" nos processos OAB continua no mesmo lugar; a fonte dos novos andamentos passa a ser Escavador (semanal).
- Andamentos novos chegam por webhook semanal em vez de diário. Toasts e tooltips são atualizados.
- Mensagens de "processo sigiloso / credencial" da Judit deixam de aparecer ao ativar.
- Botão/seção "Escavador (beta)" no detalhe do processo é absorvido pelo toggle principal — não há mais dois botões competindo.

**Dados**
- Nova tabela `processo_oab_monitoramento_escavador` (vazia inicialmente). Sem migração de dados.
- `processos_oab_andamentos` passa a receber inserts vindos do Escavador, com mesmo schema atual (campos `origem`/`fonte` se existirem; caso contrário, gravar `'escavador'` num campo livre/metadata).
- `processo_monitoramento_judit` continua intacto; nada é deletado.
- Trackings antigos na Judit são removidos sob demanda (no toggle off), liberando slots e parando cobranças residuais.

**Riscos colaterais**
- Processos hoje monitorados pela Judit continuarão recebendo andamentos da Judit até o usuário desativar/reativar (não há reativação em massa neste plano). Posso propor depois um job de migração.
- Cobertura do Escavador pode ser menor que a da Judit em certos tribunais — alguns processos podem retornar "não encontrado" ao ativar. O toast deixa isso explícito.
- Webhook do Escavador precisa estar configurado no painel deles apontando para `/functions/v1/escavador-webhook` (já está, segundo a função existente).

**Quem é afetado**
- Todos os tenants que usam o módulo Controladoria/OAB.
- Funções recorrentes da Judit (`judit-sync-monitorados` etc.) continuam ativas mas deixam de receber novos processos a partir desta alteração — não removidas neste plano.

## Validação

1. Migration aplica e a nova tabela existe com RLS/GRANTs (`supabase--read_query`).
2. Ativar monitoramento em um processo OAB de teste:
   - `escavador-ativar-monitoramento-oab` retorna `success: true`, popula `processos_oab_andamentos` com a carga inicial e cria linha em `processo_oab_monitoramento_escavador` com `monitoramento_id` preenchido.
   - `processos_oab.monitoramento_ativo = true`.
3. Simular webhook do Escavador (`supabase--curl_edge_functions` em `escavador-webhook` com payload contendo `processo_id` igual ao `escavador_id` salvo) → novo andamento aparece em `processos_oab_andamentos` como não-lido.
4. Desativar monitoramento:
   - `escavador-desativar-monitoramento-oab` retorna `success`; tabela marca `monitoramento_ativo=false`.
   - `judit-desativar-monitoramento` é chamado e responde 200 (ou é silenciosamente ignorado se nunca houve tracking).
   - `processos_oab.monitoramento_ativo = false`.
5. UI: na página de Controladoria, o toggle reflete o estado correto após reload; toasts mostram texto novo.