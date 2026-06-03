## Objetivo

Para o processo `5000609-66.2025.8.13.0685` (id `2ac98654-2690-4008-ba52-07bd072fafa1`), consultar o último `request_id` do `tracking_id` atual (GET gratuito), pegar as **últimas 5 movimentações** retornadas, e sincronizar os anexos dessas movimentações em `processos_oab_anexos` — atualizando `status`, `attachment_id` e demais campos a partir da resposta fresca da Judit.

## Causa raiz

Os 44 anexos do processo foram inseridos a partir de webhooks antigos com `status='pending'`. Não sabemos se a Judit já processou os PDFs desde então. Em vez de "chutar" `status='done'` em todos, vamos buscar o estado real diretamente da API (sem custo, pois é apenas leitura via `tracking_id` + `request_id`).

## Correção

Criar uma edge function descartável `judit-sync-ultimos-anexos` que:

1. Recebe `{ processoId, limite=5 }` no body.
2. Lê `tracking_id` do processo em `processos_oab`.
3. `GET /tracking/{tracking_id}` → pega `last_request_id`.
4. `GET /responses?request_id={last_request_id}&page_size=100` → pega `response_data`.
5. Extrai `steps` (já vêm ordenados desc pela Judit, ou ordena por `step_date` desc) e fica com os 5 primeiros.
6. Para cada step, lê `step.attachments[]` e faz `UPSERT` em `processos_oab_anexos` com `onConflict: 'processo_oab_id,attachment_id'`:
   - `status` ← valor real da Judit (`done` / `pending`)
   - `attachment_name`, `extension`, `content_description`, `is_private`, `step_id` (em lowercase para casar com a UI)
7. Retorna um relatório: `stepsConsiderados`, `anexosAtualizados`, `pendingAntes/depois`, `doneAntes/depois`.

A função **não cria registros novos do zero** se o anexo já existir — só atualiza. E **não toca em anexos de movimentações antigas** (fora das 5 últimas), preservando o histórico.

## Arquivos afetados

- `supabase/functions/judit-sync-ultimos-anexos/index.ts` (novo, descartável)
- Nenhuma migration, nenhum schema novo, nenhuma alteração de UI.

## Impacto

**UX/usuário final:**
- Os anexos das últimas 5 movimentações do processo passam a refletir o estado real da Judit. Se a Judit já processou (provável, dado que faz tempo), o usuário consegue baixar os PDFs imediatamente.
- Anexos antigos (fora das últimas 5) permanecem como estão — sem regressão.

**Dados:**
- Apenas `UPDATE` nos campos `status`, `attachment_name`, `extension`, `content_description`, `is_private`, `step_id` dos anexos das últimas 5 movimentações deste único processo (`processo_oab_id = '2ac98654-...'`).
- Nenhuma deleção, nenhum INSERT novo (a menos que a Judit retorne um `attachment_id` que ainda não existe — nesse caso, o upsert cria, que é o comportamento desejado).

**Riscos colaterais:**
- Nenhum. Escopo restrito a 1 processo + 5 steps.
- 1 chamada paga? **Não** — `GET /tracking/{id}` e `GET /responses?request_id=...` são leituras gratuitas no plano Judit.
- Se a Judit retornar `status='pending'` ainda, simplesmente confirmamos que o PDF não está pronto — sem dano.

**Quem é afetado:**
- Apenas usuários do tenant dono deste processo, na visualização deste processo específico.

## Validação

1. Antes: `SELECT status, COUNT(*) FROM processos_oab_anexos WHERE processo_oab_id='2ac98654-...' GROUP BY status;`
2. Invocar a função via `supabase.functions.invoke('judit-sync-ultimos-anexos', { body: { processoId: '2ac98654-2690-4008-ba52-07bd072fafa1' } })`.
3. Conferir a resposta JSON com `stepsConsiderados` e `anexosAtualizados`.
4. Depois: rodar a mesma query de contagem e comparar.
5. Abrir o processo na UI e tentar baixar um anexo que tenha virado `done`.
