## Causa raiz

Hoje o painel mostra apenas o resultado da última execução (rolagem dos últimos 100). O histórico geral existe mas é uma lista única, sem separação por padrão de CNJ. O usuário quer poder voltar depois e ver, por tribunal (ex.: TJPR `%.8.16.%`, TJSP `%.8.26.%` etc.), todos os trackings antigos pausados e os novos gerados.

Os dados já são gravados em `judit_migracao_attachments` (com `motivo='rebind_credencial'`, `customer_key`, `tracking_id_antigo`, `tracking_id_novo`, `antigo_pausado`, `executado_em`). Basta consultá-los filtrados por padrão.

## Correção

1. **Edge function `judit-rebind-credencial-lote`** — no modo `history`, aceitar `cnjPattern` opcional e aplicar `.ilike('numero_cnj', cnjPattern)` quando informado. Sem mudança de schema.

2. **Hook `useRebindCredencialJudit`** — adicionar `cnjPattern` ao body quando `mode === 'history'`.

3. **`RebindCredencialJuditPanel.tsx`** — nova seção "Histórico por padrão" com `Tabs` (shadcn):
   - Uma aba por preset (TJPR, TJSP, TJMG, TJSC, TJRO, TJTO, Todos) + aba "Custom" para o pattern digitado.
   - Ao abrir a aba pela primeira vez (ou clicar "Recarregar"), chama `history` com `tenantId + customerKey + cnjPattern` e mostra em `ScrollArea` (altura ~400px) ordenado por `executado_em desc`.
   - Cada linha: data · `numero_cnj` · `tracking_antigo` → `tracking_novo` · badge "pausado"/"não pausado" · badge status (migrado/erro).
   - Botão "CSV" por aba reusa `exportHistoryCsv` filtrado.
   - Cache local em `useState` por pattern (Map) para não recarregar a cada troca de aba.

4. Manter o bloco "Histórico" antigo (carrega tudo) ou removê-lo — proponho **substituir** pelas abas para evitar duplicidade.

## Arquivos afetados

- `supabase/functions/judit-rebind-credencial-lote/index.ts` — filtro `cnjPattern` em `history`.
- `src/hooks/useRebindCredencialJudit.ts` — passar `cnjPattern` em `history`.
- `src/components/Controladoria/RebindCredencialJuditPanel.tsx` — adicionar `Tabs` + cache por pattern, remover bloco "Carregar histórico" único.

## Impacto

- **Usuário final (UX):** super-admin na Controladoria → aba "Recriar trackings" passa a ter uma seção com abas por tribunal. Toda execução fica consultável depois, separada por padrão, com scroll completo (não só últimos 100). Resolve o pedido de "salvar para ver depois".
- **Dados:** zero migrações, zero RLS, zero mudança de schema. Só uma leitura extra com `ilike` em `judit_migracao_attachments` (já indexável por `tenant_id`).
- **Riscos colaterais:** baixíssimo. Aba "Todos" pode trazer muitas linhas — limitado a `historyLimit=1000` (mesmo limite atual).
- **Quem é afetado:** apenas super-admins que usam o painel `RebindCredencialJuditPanel` na Controladoria. Nenhum outro fluxo toca esse código.

## Validação

1. Mudar credencial para `alangeral`, abrir aba TJPR → ver os CNJs já migrados nesta sessão (antigo pausado, novo gerado).
2. Executar lote em TJSP → abrir aba TJSP, clicar "Recarregar" → ver os novos registros.
3. Trocar para aba TJMG → vazio (nada migrado). Trocar de volta para TJPR → mostra cache sem recarregar.
4. Exportar CSV de uma aba e conferir que só traz os CNJs daquele padrão.
