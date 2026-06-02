## Causa raiz

Webhooks antigos do Judit (`judit-webhook`, `judit-webhook-oab`, `judit-webhook-cnpj`) descartavam o campo `attachments` ao processar respostas. A correção anterior fez com que **novas** atualizações já gravem anexos em `processos_oab_anexos`, mas o **histórico** continua vazio — mesmo com PDFs disponíveis no Judit.

## Correção

Rodar a edge function `judit-backfill-anexos` (já criada) para tenants ativos com `with_attachments=true`, em modo **idempotente e não-destrutivo**:

1. **Levantamento prévio (dry-run / read-only)** — Query `supabase--read_query` para listar:
   - Tenants ativos com pelo menos 1 processo monitorado com `with_attachments=true`.
   - Total de trackings elegíveis por tenant.
   - Total atual de linhas em `processos_oab_anexos` por tenant (baseline).

2. **Execução escalonada por tenant** — Chamar `judit-backfill-anexos` em lotes pequenos (por tenant), começando pelo tenant `27492091-…` (caso original do Wesley) como canário. A função:
   - Lê o histórico Judit de cada tracking.
   - Faz `UPSERT` com `onConflict: 'processo_oab_id,attachment_id'` → **nunca duplica**, **nunca apaga**.
   - Não toca em `steps`, `movimentacoes`, nem em metadados do processo.

3. **Validação após cada tenant** — Comparar contagem antes/depois em `processos_oab_anexos`; abrir o processo `0043825-70.2024.8.16.0021` no Vouti e confirmar PDFs visíveis na movimentação.

4. **Rollback** — Como a operação é apenas `INSERT` via upsert e nada é sobrescrito/apagado, rollback é simplesmente "não rodar novamente". Caso queira reverter um lote específico, é possível deletar pelo `created_at` do batch (faremos esse `DELETE` apenas se você pedir).

## Arquivos afetados

Nenhum arquivo de código. Apenas execução da edge function existente `supabase/functions/judit-backfill-anexos/index.ts` (ainda preciso confirmar que está deployada e respondendo — última verificação retornava `NOT_FOUND`; se persistir, redeploy antes de executar).

## Impacto

1. **UX / Usuário final**: Movimentações antigas que tinham PDFs no Judit passam a exibir os anexos clicáveis em "Documentos". Nenhuma tela é alterada visualmente além disso. Nenhum dado existente desaparece.
2. **Dados**: Apenas `INSERT` em `processos_oab_anexos` via `UPSERT` idempotente. Sem migrations, sem mudança de RLS, sem mudança de schema. Crescimento estimado: dezenas a centenas de linhas por tenant (depende do volume). Índice já existe no `onConflict`.
3. **Riscos colaterais**:
   - **Custo Judit**: o backfill **lê** o histórico já armazenado nas respostas anteriores do tracking — não dispara novas requisições pagas ao Judit (a função usa `responses` já persistidas). Confirmar isso na primeira execução com 1 tracking.
   - **Carga DB**: insignificante (upserts em lote pequeno).
   - **Realtime**: clientes com a tela do processo aberta podem ver anexos aparecerem em tempo real — comportamento esperado, não quebra nada.
4. **Quem é afetado**: Apenas tenants com `with_attachments=true` no monitoramento Judit. Demais tenants ficam inalterados. Admins veem o resultado; advogados/estagiários ganham acesso aos PDFs históricos respeitando as RLS já existentes de `processos_oab_anexos`.

## Validação

- Baseline de contagem por tenant antes e depois.
- Teste canário no processo `0043825-70.2024.8.16.0021` (tenant `27492091-…`): abrir a movimentação e confirmar PDFs.
- Logs da edge function: verificar `anexosInseridos` > 0 e ausência de erros.
- Confirmar que nenhuma linha de `steps`/`movimentacoes` foi alterada (contagem antes/depois).
- Se algo soar estranho em qualquer etapa, **paro imediatamente** antes de avançar para o próximo tenant.

## Plano de execução resumido

1. Confirmar deploy de `judit-backfill-anexos` (redeploy se `NOT_FOUND`).
2. Listar tenants elegíveis + baseline de anexos.
3. Rodar canário no tenant do Wesley → validar visualmente.
4. Rodar nos demais tenants, um por um, com checagem após cada.
5. Relatório final: linhas inseridas por tenant, processos beneficiados, eventuais erros.
