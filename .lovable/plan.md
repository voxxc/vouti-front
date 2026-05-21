# Backfill real de Publicações via Judit — Demorais (one-shot)

Sem inventar nada. Vamos consultar a Judit usando os `tracking_id` que já temos cadastrados, varrer o histórico real de respostas, identificar decisões com anexos e criar as publicações com PDF baixado.

## Causa raiz

A auto-alimentação de publicações só roda em sincronizações novas (`judit-sync-monitorados`). Decisões já existentes no histórico dos processos monitorados nunca foram processadas — então a aba Publicações do Demorais está vazia mesmo havendo dados reais na Judit.

## Correção

Edge Function one-shot `judit-backfill-publicacoes-demorais` (invocação manual, sem cron):

1. Busca todos os `processos_oab` do tenant `demorais` com `tracking_id IS NOT NULL`.
2. Para cada processo:
   a. `GET https://tracking.prod.judit.io/tracking/{tracking_id}` para obter o histórico de `request_id` (todos os checks que a Judit já fez).
   b. Para cada `request_id` retornado: `GET https://requests.prod.judit.io/responses?request_id=...&page_size=100`.
   c. Varre `response_data.steps[]` procurando steps cujo `content` bata com as palavras-chave de decisão (sentença, defiro, indefiro, liminar, homologo, julgo, despacho decisório, decisão monocrática etc.) **E** que tenham `attachments` não vazio.
3. Para cada step qualificado:
   - Faz upsert em `processos_oab_anexos` (chaves: `processo_oab_id` + `step_id` + `attachment_id`).
   - Baixa o PDF real via `GET https://requests.prod.judit.io/responses/{response_id}/attachments/{attachment_id}`.
   - Salva no bucket `processo-documentos` em `{tenant_id}/{processo_oab_id}/{anexo_id}.{ext}`.
   - Extrai texto com `pdfjs-dist` (até 50 KB).
   - Insere em `publicacoes` (`origem='monitoramento_processo'`, `tipo='Decisão'`, com `processo_oab_id`, `andamento_id` quando existir, `anexo_id`, `storage_path`, `conteudo_completo`, `data_disponibilizacao = step.step_date`).
   - O índice único anti-duplicidade já criado garante idempotência — pode rodar várias vezes sem duplicar.
4. Restrição dura: só executa se o slug do tenant resolvido for `demorais`. Outros tenants são rejeitados com 403.
5. Retorna JSON com totais: processos varridos, requests consultados, decisões encontradas, anexos baixados, publicações criadas, erros por processo.

Disparo: botão **"Backfill Publicações (real)"** no card do tenant Demorais no Super-Admin, com confirmação. Mostra contadores no fim.

## Arquivos afetados

- `supabase/functions/judit-backfill-publicacoes-demorais/index.ts` (nova)
- `src/components/SuperAdmin/TenantCard.tsx` ou linha expandida da tabela: novo botão visível só para `slug='demorais'`
- Sem migration. Schema já está pronto (`publicacoes.origem/storage_path/anexo_id/...`, índice único, bucket `processo-documentos`).

## Impacto

- **Usuário final (Demorais):** Aba Publicações passa a listar decisões reais com PDF clicável ("Abrir documento"). Conteúdo extraído de PDF real, não inferido.
- **Dados:** Linhas novas em `publicacoes`, `processos_oab_anexos`, arquivos novos em `processo-documentos/{tenant_demorais}/...`. Sem `UPDATE` em dados existentes. Sem alteração de schema.
- **Performance / custo Judit:** Consome chamadas à API Judit proporcional a (nº de processos monitorados) × (média de requests no histórico). Execução serial com pequeno delay entre processos, em background (`EdgeRuntime.waitUntil`). Estimado em poucos minutos para o Demorais.
- **Riscos colaterais:** Nenhum em outros tenants — função recusa qualquer tenant ≠ `demorais`. Risco residual: falsos positivos por palavra-chave ampla ("decisão"); você pode descartar pelo próprio drawer (status "descartada"). Se um PDF falhar no download, a função registra erro no retorno e segue para o próximo (não cria publicação sem `storage_path` válido).
- **Quem é afetado:** Apenas Super-Admin (dispara) e usuários do tenant Demorais (veem o resultado).

## Validação

- Antes: `SELECT count(*) FROM publicacoes WHERE tenant_id=<demorais> AND origem='monitoramento_processo'` → atual.
- Disparar a função pelo botão; ler o JSON de retorno.
- Depois: rodar a mesma contagem + abrir a aba Publicações no Demorais.
- Spot-check: pegar 2-3 publicações, clicar "Abrir documento" e confirmar que o PDF da Judit abre.
- Reversão limpa, se quiser: `DELETE FROM publicacoes WHERE tenant_id=<demorais> AND origem='monitoramento_processo'` + `DELETE FROM storage.objects WHERE bucket_id='processo-documentos' AND name LIKE '<tenant_demorais>/%'` (cuidado — só faça se quiser refazer do zero).

## Próximo passo (depois do teste)

Se gostar do resultado, ligamos a auto-alimentação em produção (já implementada em `judit-sync-monitorados`) e replicamos para outros tenants quando você autorizar.
