# Causa raiz

A coluna `dedup_hash` em `processos_oab_andamentos` é `GENERATED ALWAYS` (calculada por `compute_andamento_dedup_hash(descricao)`). A edge function `escavador-importar-processo` está tentando passar `dedup_hash` no INSERT, e o Postgres rejeita com `428C9: cannot insert a non-DEFAULT value into column "dedup_hash"`.

Resultado: as 18 movimentações foram trazidas do Escavador mas nenhuma foi gravada. Por isso, depois de importar, a aba de andamentos ficou vazia — independente de clicar em "Reprocessar".

# Correção

Em `supabase/functions/escavador-importar-processo/index.ts` (linhas 476-487):
- Remover `dedup_hash: dedup` do payload do `insert`. O Postgres calcula sozinho.
- Remover o cálculo manual `dedupHashOab(...)` na linha 474 (vira código morto).

Após o deploy, a importação que já dispara a edge function em background no momento do clique em "Importar Processo" passa a popular os andamentos sozinha — sem reprocessar.

# Arquivos afetados

- `supabase/functions/escavador-importar-processo/index.ts`

# Impacto

- **Usuário final:** importação por OAB ou por CNJ passa a trazer capa **e** andamentos automaticamente, sem nenhum clique extra. O toast "📋 Andamentos carregados — N andamentos registrados" volta a refletir a verdade.
- **Dados:** nenhum schema muda. INSERT deixa de enviar uma coluna gerada. Idempotência continua garantida pelo índice único sobre `dedup_hash` calculado pelo Postgres.
- **Riscos colaterais:** nenhum. Erro 23505 (duplicado) continua sendo tratado silenciosamente.
- **Quem é afetado:** todos os tenants que importam processos via Escavador.

# Validação

1. Após deploy, no tenant demorais, **deletar** o registro atual de `0123417-95.2025.8.16.0000` (ou usar outro CNJ) e importar novamente pelo fluxo normal.
2. Sem clicar em nada extra, abrir o processo: a aba "Andamentos" deve mostrar as 18 movimentações.
3. Logs da edge function devem mostrar `OAB ... insert detail: novos=18 duplicados=0 erros=0`.
4. Reimportar idempotência: `novos=0 duplicados=18`.
