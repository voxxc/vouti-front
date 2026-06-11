## Causa raiz

As três Edge Functions que ativam monitoramento na Judit estão enviando `with_attachments: true`, o que cria monitoramento com anexos (mais caro/pesado). O usuário quer monitoramento comum (sem anexos) sempre que for ativado.

Ocorrências encontradas:
- `supabase/functions/judit-ativar-monitoramento/index.ts` (linhas 76 e 125)
- `supabase/functions/judit-ativar-monitoramento-oab/index.ts` (linhas 157 e 227)
- `supabase/functions/judit-ativar-monitoramento-cnpj/index.ts` (linhas 51 e 72)

## Correção

Trocar todos os `with_attachments: true` por `with_attachments: false` nas três funções, tanto no payload enviado para a API da Judit quanto no `update` que grava a flag na nossa tabela (`processos.with_attachments` no caso da função principal).

Nenhuma alteração de schema, RLS ou frontend. Monitoramentos já ativos hoje (com anexo) permanecem como estão — a regra vale para futuras ativações. Se quiser, num passo seguinte podemos rodar um update em massa para desligar `with_attachments` nos já ativos e cancelar/reativar na Judit, mas isso não está no pedido.

## Arquivos afetados

- `supabase/functions/judit-ativar-monitoramento/index.ts`
- `supabase/functions/judit-ativar-monitoramento-oab/index.ts`
- `supabase/functions/judit-ativar-monitoramento-cnpj/index.ts`

## Impacto

1. **Usuário final (UX):** nenhuma mudança visível. O botão "Ativar monitoramento" continua igual; só passa a criar tracking sem anexos.
2. **Dados:** novos monitoramentos serão gravados com `with_attachments = false`. Reduz custo de API Judit e volume de anexos baixados. Monitoramentos antigos não são tocados.
3. **Riscos colaterais:** funções/automação que dependem de receber anexos automáticos via tracking (ex.: backfill de anexos, push-docs) não recebem mais via novos trackings — só por demanda manual. Se houver fluxo crítico que assume anexo automático, ele precisará de revisão.
4. **Quem é afetado:** todos os tenants e todos os perfis que ativam monitoramento (CNJ, OAB, CNPJ).

## Validação

- Ativar um monitoramento de teste em cada um dos três fluxos (CNJ, OAB, CNPJ) e conferir nos logs da Edge Function que o payload enviado à Judit contém `with_attachments: false`.
- Verificar no banco que o registro correspondente foi gravado com `with_attachments = false`.