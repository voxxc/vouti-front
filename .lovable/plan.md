# Remover pausa de monitoramento no botão "Atualizar"

## Causa raiz
A Edge Function `judit-resetar-processo` foi escrita assumindo que disparar um novo `request on_demand` poderia gerar conflito ou cobrança duplicada com o tracking ativo. Por isso, no passo 3 ela faz `PATCH /tracking/{id} {status: 'paused'}`, limpa `tracking_id`/`tracking_request_id` em `processos_oab`, marca `monitoramento_ativo = false` em `processo_monitoramento_judit` e registra `tracking_desativado` em `tenant_banco_ids`.

Na prática, **request sob demanda e tracking são serviços independentes na Judit**: o tracking continua monitorando o tribunal em background mesmo quando você dispara um POST avulso. Pausar o tracking só cria trabalho manual (reativar depois) e gera a sensação de que o processo "saiu" do monitoramento.

## Correção
Na função `judit-resetar-processo`:
1. Remover por completo o bloco de pausa (PATCH na Judit + updates em `processos_oab`, `processo_monitoramento_judit`, `tenant_banco_ids`).
2. Manter intactos: a trava `detalhes_request_data = now()` (passo 2, anti-race com o cron), a busca de credencial, o POST `on_demand`, o polling, a deduplicação de andamentos e o registro em `tenant_banco_ids` tipo `request_detalhes`.
3. Remover do response os campos `trackingDesativado` e `monitoramentoDesativado` (sempre serão `null`/`false`). Manter `success`, `requestId`, `andamentosNovos` para compatibilidade.
4. Remover do metadata do `tenant_banco_ids` (passo 9) o campo `tracking_desativado`.

Front-end: o hook/handler que chama o reset já consome só `andamentosNovos` para o toast — não precisa alteração. Se algum componente lê `monitoramentoDesativado` para avisar o usuário, remover esse aviso.

## Arquivos afetados
- `supabase/functions/judit-resetar-processo/index.ts` — remover passo 3 e ajustar response/metadata.
- `src/hooks/useOABs.ts` (e `useAllProcessosOAB.ts` se aplicável) — varrer uso de `monitoramentoDesativado`/`trackingDesativado` no retorno e remover toasts/alertas relacionados.
- `src/components/Controladoria/OABTab.tsx` e demais consumidores do reset — mesma varredura.

Nenhuma migration. Nenhuma mudança em RLS. Nenhum dado existente é tocado retroativamente (processos cujo tracking foi pausado no passado continuam pausados — tratamento desses fica como item separado, se quiser).

## Impacto

**1. Usuário final (UX)**
- Clicar "Atualizar" passa a ser uma operação puramente aditiva: traz andamentos novos e mantém o monitoramento como estava.
- Some o estado confuso em que o ícone de monitoramento "apagava" depois de atualizar.
- Toasts ficam mais limpos: só "X novos andamentos" sem o aviso de "monitoramento desativado".

**2. Dados**
- Sem migration. Sem alteração de schema.
- Para de inserir registros tipo `tracking_desativado` com motivo `reset_manual` em `tenant_banco_ids`.
- Para de chamar `PATCH /tracking/{id}` na Judit (uma chamada externa a menos por reset — ligeiramente mais rápido).
- Processos que já tiveram o tracking pausado por resets anteriores continuam pausados; precisam ser reativados manualmente ou por uma rotina separada (não escopo deste plano).

**3. Riscos colaterais**
- Risco baixo de duplicidade de andamento no momento do reset: o cron `judit-sync-monitorados` pode pegar o mesmo step que o reset acabou de inserir. **Mitigado pela trava `detalhes_request_data = now()`** já existente (sync ignora processos atualizados recentemente) e pela deduplicação por chave `data+descrição`.
- Sem risco de cobrança duplicada na Judit: tracking e request on_demand são faturados separadamente; rodar os dois em paralelo já era o comportamento esperado pela API.

**4. Quem é afetado**
- Todos os tenants com processos OAB monitorados.
- Usuários com acesso ao drawer de detalhes do processo (`advogado` em diante).
- Super-Admin: a aba "Trackings OFF" do Banco de IDs para de receber novas entradas com motivo `reset_manual` (continua recebendo desativações manuais reais).

## Validação
1. Em ambiente de teste, abrir um processo OAB com `monitoramento_ativo = true` e `tracking_id` preenchido.
2. Clicar "Atualizar".
3. Confirmar via SQL: `tracking_id` e `monitoramento_ativo` permanecem inalterados após o reset.
4. Confirmar que `detalhes_request_id` e `detalhes_request_data` foram atualizados.
5. Confirmar que andamentos novos apareceram (se houver) sem duplicar antigos.
6. Conferir `judit_api_logs`: deve existir `reset_processo_post` (sucesso), e **não** deve existir `reset_processo_pause`.
7. Conferir `tenant_banco_ids`: novo registro `request_detalhes` criado, **nenhum** novo `tracking_desativado`.
