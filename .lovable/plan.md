## Causa raiz

No processo `4001400-13.2026.8.26.0408` (tenant `27492091…`), o tracking Judit está com `with_attachments=true` (rebind aplicado em 26/05), há 22 andamentos sincronizados, mas **0 linhas em `processos_oab_anexos`**. Última inserção de anexo desse tenant foi em **22/01/2026**.

O `judit-sync-monitorados/index.ts` (linhas 628-631) só persiste anexos quando:

```ts
processo.tenant_id === DEMORAIS_TENANT_ID && isDecisao(stepContent)
```

Ou seja, mesmo com `with_attachments=true` no tracking e a Judit devolvendo os anexos no payload do sync, **qualquer tenant diferente do piloto Demorais é ignorado**. Os poucos anexos antigos vieram de chamadas manuais ao `judit-buscar-detalhes-processo`, não do sync automático.

## Correção

1. **Remover o gate por tenant** em `judit-sync-monitorados/index.ts`. Trocar:
   ```ts
   if (processo.tenant_id === DEMORAIS_TENANT_ID && insertedAndamento?.id && isDecisao(stepContent))
   ```
   por:
   ```ts
   if (processo.with_attachments === true && insertedAndamento?.id && isDecisao(stepContent))
   ```
   Ler `with_attachments` do `processos_oab` no SELECT que já carrega `processo` (adicionar a coluna ao select se ainda não estiver).

2. **Manter `isDecisao`** como filtro (sentença, despacho decisório, liminar, intimação de decisão, julgo, homologo, defiro, indefiro, condeno, extingo, tutela). Petições continuam não baixando — é o desejado para economizar storage/CPU. Verificar a lista atual de keywords e confirmar que cobre "intimação de decisão" (adicionar `intimação` + `intimacao` se não estiverem).

3. **Auto-criação em `publicacoes`** dentro de `processarAnexosDeDecisao` (hoje específica do piloto Demorais): manter gated por `DEMORAIS_TENANT_ID` dentro da função, ou separar em duas etapas — upload do anexo para todos, criação de publicação só para Demorais. Padrão: separar.

4. **Backfill manual** do processo em questão: invocar `judit-buscar-detalhes-processo` para `d909f408-…` puxar os anexos retroativos dos 22 andamentos já existentes (a partir daqui o sync automático cobre os novos).

## Arquivos afetados

- `supabase/functions/judit-sync-monitorados/index.ts` — remover gate de tenant, ajustar SELECT do `processos_oab` para incluir `with_attachments`, separar criação de Publicação da persistência do anexo.
- Nenhuma migration. Nenhuma alteração de schema. Nenhuma alteração de frontend.

## Impacto

**1. Usuário final (UX/telas/fluxos):**
- Em todos os tenants, quando um andamento de decisão chega via sync, o anexo aparece automaticamente no card do andamento (ícone de clipe) e fica baixável pelo `useProcessoAnexos`.
- Nada muda visualmente — o componente já trata `anexosPorStep`. Só passa a ter dados.

**2. Dados (migrations/RLS/performance):**
- Sem migration, sem mudança de RLS (a tabela `processos_oab_anexos` já tem RLS por tenant_id).
- **Aumento de uso do bucket `processo-documentos`**: cada decisão com PDF anexo passa a fazer upload. Estimativa: dezenas a centenas de PDFs/dia por tenant ativo. Storage e egress aumentam proporcionalmente.
- **CPU/tempo do sync**: `extractPdfText` roda em PDFs de decisão (até 50 páginas, 50k chars). Cada anexo adiciona ~1-3s ao processamento do andamento. Pode aumentar duração do cron e risco de timeout em batches grandes.

**3. Riscos colaterais:**
- Se a função `judit-sync-monitorados` rodar em batch grande e muitos andamentos vierem com anexo, pode estourar o limite de tempo da edge function. Monitorar logs após deploy.
- Se algum tenant tiver `with_attachments=true` indevidamente mas plano não cobrir storage, podemos gerar custo. Vale conferir antes do deploy se há tenants nessa condição (`SELECT DISTINCT tenant_id FROM processos_oab WHERE with_attachments=true`).
- A criação automática em `publicacoes` continua restrita ao Demorais — nenhum tenant novo recebe publicações automáticas sem decisão explícita.

**4. Quem é afetado:**
- **Todos os tenants** com `with_attachments=true` em pelo menos um tracking (hoje: o piloto Demorais + os tenants migrados pelo painel de rebind, incluindo `27492091…`).
- **Admin / Controladoria**: ganham visibilidade dos anexos sem precisar abrir cada processo manualmente.
- **Advogado / Estagiário**: passam a ver clipes de anexo nos andamentos de decisão dos processos monitorados.
- Demorais: comportamento inalterado (continua recebendo anexo + publicação automática).

## Validação

1. Deploy de `judit-sync-monitorados`.
2. Invocar `judit-buscar-detalhes-processo` para `d909f408-b0ca-4a45-b5cc-41222a5f77bb` (backfill manual) e verificar que `processos_oab_anexos` recebe linhas.
3. Forçar `judit-sync-monitorados` e checar logs por `[SYNC][anexo]`.
4. Query de sanidade após 1 ciclo de sync:
   ```sql
   SELECT tenant_id, count(*), max(created_at)
   FROM processos_oab_anexos
   WHERE created_at > now() - interval '1 day'
   GROUP BY tenant_id;
   ```
   Esperar ≥1 tenant não-Demorais com anexos recentes.
5. UI: abrir o processo `4001400-13.2026.8.26.0408` e confirmar clipes nos andamentos de decisão.