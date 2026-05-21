# Teste visual de Publicação via Request CNJ — one-shot

Você fornece um CNJ, eu disparo um Request CNJ com `with_attachments: true` na Judit, pego **somente o último documento anexado** do response, baixo o PDF, salvo no storage e crio **uma única publicação** no tenant Demorais para você ver o visual real.

## Causa raiz

Aba Publicações nunca foi exposta com decisões reais (PDF baixado). Sem material para julgar o layout final.

## Correção

Edge Function one-shot `judit-test-publicacao-cnj`:

1. Recebe `{ numero_cnj }` via POST. Restrita a Super-Admin.
2. `POST https://requests.prod.judit.io/requests` com:
   ```json
   { "search": { "search_type": "lawsuit_cnj", "search_key": "<cnj>", "on_demand": true }, "with_attachments": true }
   ```
3. Polling em `GET /responses?request_id=...` até `status` final (até ~30s).
4. Extrai `response_data.steps[]` ordenados por `step_date` desc. Pega o **primeiro step com `attachments` não vazio** (= último documento publicado).
5. Pega o **último attachment** desse step.
6. Vincula a um `processos_oab` do tenant Demorais quando o CNJ existir lá (senão `processo_oab_id = NULL`, ainda assim cria a publicação só para visualização).
7. Upsert em `processos_oab_anexos` (se houver processo vinculado).
8. Baixa o binário do anexo via `GET /responses/{response_id}/attachments/{attachment_id}` (header `api-key`).
9. Salva em `processo-documentos/<tenant_demorais>/<processo_oab_id ou "_avulso">/<anexo_id>.<ext>`.
10. Extrai texto com `pdfjs-dist` (até 50 KB).
11. Insere **uma linha** em `publicacoes` (`origem='monitoramento_processo'`, `tipo='Decisão (teste)'`, `numero_processo=<cnj>`, `data_disponibilizacao=step.step_date`, `conteudo_completo=<texto>`, `storage_path=<caminho>`, `tenant_id=<demorais>`).
12. Retorna JSON com `publicacao_id`, `storage_path`, `attachment_name`, prévia do texto.

Disparo: novo card no Super-Admin (ao lado do "Teste de Importação CNJ") chamado **"Teste Publicação CNJ"** com input do CNJ e botão "Criar publicação de teste". Toast com link "Abrir aba Publicações".

## Arquivos afetados

- `supabase/functions/judit-test-publicacao-cnj/index.ts` (nova).
- `src/components/SuperAdmin/SuperAdminTestPublicacaoCNJ.tsx` (nova, espelha o padrão de `SuperAdminImportCNJTest.tsx`).
- Registro do componente na aba de testes existente do Super-Admin.
- Sem migration. Schema, índice único e bucket já existem.

## Impacto

- **Usuário final:** Você vê uma publicação real no Demorais com PDF clicável ("Abrir documento"). Nenhuma alteração para outros usuários ou tenants.
- **Dados:** 1 linha em `publicacoes`, até 1 em `processos_oab_anexos`, 1 arquivo no bucket. Sem `UPDATE` em nada existente. Sem mudança de schema.
- **Custo / API:** 1 request Judit com attachments + 1 download de PDF. Custo desprezível.
- **Riscos colaterais:** Nulos em outros tenants — função recusa qualquer destino diferente de Demorais. Se rodar com mesmo CNJ várias vezes, o índice único anti-duplicidade evita publicações duplicadas (retorna a existente).
- **Quem é afetado:** Apenas Super-Admin (dispara) e usuários do Demorais (veem a publicação na aba).

## Validação

1. Você me passa um CNJ que sabe ter movimento com PDF (idealmente uma decisão recente).
2. Disparar pelo botão; aguardar toast de sucesso.
3. Abrir aba Publicações no Demorais → conferir badge "Monitoramento", o número do processo e clicar em "Abrir documento" para ver o PDF original.
4. Se o visual agradar, evoluímos para o backfill em lote ou ligamos a auto-alimentação. Se não, ajustamos só a UI sem precisar refazer a parte de integração.

## Reversão

`DELETE FROM publicacoes WHERE id = '<retornado>'` + remover o objeto correspondente do bucket. Trivial.
