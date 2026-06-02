## Causa raiz

Os anexos (`attachments`) chegam junto da resposta da Judit nos webhooks de tracking, mas **somente `judit-buscar-detalhes-processo` faz a leitura/inserção em `processos_oab_anexos`**. Os webhooks de tempo real (`judit-webhook-oab`, `judit-webhook-cnpj`, `judit-webhook`) processam apenas `steps` (movimentações) e descartam `responseData.attachments`.

Por isso o processo `0043825-70.2024.8.16.0021` (tracking `32cd1778-...`) já tem `with_attachments=true` e recebe novos andamentos por webhook, mas a tabela `processos_oab_anexos` está vazia. A UI usa `anexosPorStep.get(stepId)` em `ProcessoOABDetalhes.tsx` — sem registros, mostra "Esta movimentação não possui documentos anexados", mesmo quando o PDF existe na Judit.

## Correção

1. **`judit-webhook-oab/index.ts`** — após inserir os `steps`, replicar o bloco de attachments de `judit-buscar-detalhes-processo` (linhas 435-468):
   - Ler `responseDataDirect.attachments` (e também `latestResponse.response_data.attachments` / itens de `page_data`).
   - Para cada `processo_oab` compartilhado pelo mesmo `numero_cnj`/`tenant_id`, fazer `upsert` em `processos_oab_anexos` com `onConflict: 'processo_oab_id,attachment_id'`, preservando `step_id`, `status`, `extension`, `is_private`, `content_description`.
   - Logar contagem (`anexosInseridos`) e ignorar duplicatas.

2. **`judit-webhook-cnpj/index.ts`** — mesma lógica, gravando em `processos_oab_anexos` para cada processo OAB derivado do CNPJ (mesma forma que ela já distribui andamentos).

3. **`judit-webhook/index.ts`** (CNJ legado) — mesma adição, gravando no destino correspondente (`processo_anexos_judit` se existir, ou pular se essa tabela não é usada — verificar antes de gerar a migration).

4. **Backfill imediato do processo afetado** — Disparar `judit-buscar-detalhes-processo` para o `tracking_id 32cd1778-c2d7-4e9e-84fb-b1144eae0168` (tenant `27492091-...`, CNJ `0043825-70.2024.8.16.0021`) para puxar os attachments já existentes na Judit. Isso resolve o caso atual sem esperar a próxima movimentação.

5. **(opcional) Botão "Recarregar anexos" no detalhe da movimentação** — se um andamento existir mas `anexos.length === 0`, mostrar um link que chama `judit-buscar-detalhes-processo` daquele processo. Útil para casos onde o webhook chegou antes da correção. Pode ficar para um segundo passo.

## Arquivos afetados

- `supabase/functions/judit-webhook-oab/index.ts` (adicionar bloco de attachments)
- `supabase/functions/judit-webhook-cnpj/index.ts` (adicionar bloco de attachments)
- `supabase/functions/judit-webhook/index.ts` (verificar tabela destino e adicionar)
- `src/components/Controladoria/MovimentacaoDetalhe.tsx` (opcional: botão recarregar anexos)
- Sem migrations: tabelas, RLS e índices (`processo_oab_id,attachment_id`) já existem.

## Impacto

- **Usuário final**: ao abrir uma movimentação que tenha PDFs anexos na Judit, o painel direito passa a listar os documentos com botão de download (igual ao que já acontece no processo `5e26c5c0-...`). Sem mudança visual fora dos casos com anexo.
- **Dados**: novos `INSERT/UPSERT` em `processos_oab_anexos` a cada webhook (volume baixo, ~poucos por movimentação). Sem alteração de schema, RLS, índices ou performance.
- **Riscos colaterais**: 
  - Duplicatas são protegidas pelo `onConflict (processo_oab_id, attachment_id)`.
  - Webhook de tenants sem `with_attachments=true` continua igual (campo `responseData.attachments` simplesmente virá vazio).
  - Sem efeito em andamentos antigos — só passa a popular daqui pra frente, por isso o passo 4 (backfill imediato) cobre o caso reportado.
- **Quem é afetado**: todos os tenants que já estão com `with_attachments=true` (OAB e CNPJ). Tenants antigos sem migração de attachments não veem mudança até rodar `judit-migrar-trackings-attachments`.

## Validação

1. Após deploy, executar manualmente `judit-buscar-detalhes-processo` para o tracking `32cd1778-...` e verificar `processos_oab_anexos` populada e UI mostrando documentos na movimentação JUNTADA DE PETIÇÃO DE CONTRARRAZÕES.
2. Forçar um novo webhook (Judit envia automaticamente; ou simular com `judit-consultar-tracking` + reenvio) e confirmar nos logs do `judit-webhook-oab` a linha `Anexos inseridos: N`.
3. Confirmar em outro tenant que processos sem anexo continuam funcionando normalmente (nenhum erro nos logs).
4. Conferir que duplicatas não geram erro (rodar webhook duas vezes seguidas).
