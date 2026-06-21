# Corrigir inserção de andamentos OAB que falha silenciosamente

## Causa raiz
Os logs da última importação mostram que tudo funcionou **menos** o espelhamento para `processos_oab_andamentos`:

```
[Escavador Importar V2] coletadas 18 movs | modo: rapido | status: ok
[Escavador Importar V2] ✅ 18 novas movs salvas         ← legacy table OK
[Escavador Importar V2] OAB 6a06...4b17b1: 0 novos andamentos  ← falha silenciosa
```

Investigando o schema, a tabela `processos_oab_andamentos` tem um índice **UNIQUE** com expressões:

```sql
idx_andamentos_unique_v3 ON (
  processo_oab_id,
  truncate_minute(data_movimentacao),
  normalize_descricao(descricao)
)
```

E o código atual em `supabase/functions/escavador-importar-processo/index.ts` (linhas 449-465) faz **`.insert()` puro** dos 18 andamentos e **ignora silenciosamente erros individuais** (`if (!insErr) { inseridosNesteOab++; }`). Sem nenhum `console.error`, qualquer falha — colisão de UNIQUE, NOT NULL, parse de timestamp, função `normalize_descricao` retornando NULL, etc. — some sem rastro. O resultado é os 18 inserts falharem todos sem que vejamos o motivo.

A 2ª causa provável: muitas movimentações do Escavador vêm com `mov.data` em formato só-data (`"2026-03-18"`). Quando duas mov compartilham a mesma data e descrições começam parecidas, `truncate_minute` + `normalize_descricao` podem colapsar várias para a mesma chave → o 1º insert vira conflito UNIQUE para os demais, e como é `insert` puro (não `upsert`), todos os subsequentes erram.

## Correção

### 1. Trocar `insert` por `upsert` idempotente
Em `supabase/functions/escavador-importar-processo/index.ts`, no laço dos OABs:

```ts
const { error: insErr } = await supabaseClient
  .from('processos_oab_andamentos')
  .upsert({ ... }, {
    onConflict: 'processo_oab_id,data_movimentacao,descricao',
    ignoreDuplicates: true,
  });
```

Como o índice UNIQUE é por **expressão** (`truncate_minute`, `normalize_descricao`), o PostgREST não consegue usá-lo como `onConflict` direto. Solução: usar `ignoreDuplicates` com a chave canônica e tratar `23505` (unique_violation) como sucesso silencioso, contando apenas inserts que não colidem.

Plano B (mais robusto): fazer um **SELECT** prévio das chaves já existentes (mesmo padrão já usado para a legacy table nas linhas 378-385) e pular movs que coincidem antes de chamar o insert. Isso garante 0 erros de UNIQUE.

### 2. Logar todo erro de insert
Substituir `if (!insErr) { ... }` por:

```ts
if (insErr) {
  if (insErr.code === '23505') {
    // duplicado — ok, ignora
  } else {
    console.error('[Escavador Importar V2] erro insert OAB andamento:', insErr.code, insErr.message, { dataMov, descricao: descricao.slice(0,80) });
  }
} else {
  inseridosNesteOab++;
  totalOabSalvas++;
}
```

### 3. Garantir que `data_movimentacao` seja sempre um ISO completo
Normalizar `mov.data` para `YYYY-MM-DDT00:00:00Z` quando vier só com a data, evitando ambiguidade no `truncate_minute`.

### 4. Endpoint de "reespelhamento" via reparse
Como o cache já está populado (18 movs em `escavador_data._movimentacoes_cache`), depois do fix o usuário só precisa clicar **Reprocessar resumo (do cache, grátis)** que os 18 andamentos serão inseridos sem nova cobrança Escavador.

## Arquivos afetados
- `supabase/functions/escavador-importar-processo/index.ts` — laço de inserção em `processos_oab_andamentos` (linhas ~442-487).
- Sem migrations, sem mudanças em outras tabelas, sem mudança de RLS, sem alteração de UI.

## Impacto
1. **UX:** Após o fix, importações novas trazem capa **e** andamentos visíveis na ficha OAB. Para o processo atual `0123417-95.2025.8.16.0000`, basta clicar **Reprocessar resumo** (grátis, usa cache) que os 18 andamentos aparecem.
2. **Dados:** Inserts viram idempotentes — reimportar/reprocessar não duplica nem polui logs com erros 23505. Nenhuma mudança de schema, RLS ou índices. Performance equivalente (1 SELECT prévio + N inserts em vez de N inserts cegos).
3. **Riscos colaterais:** Mínimos. O dedup já é validado pelo índice UNIQUE existente; o pré-SELECT só replica essa validação no app antes do insert. Se o cliente já tinha andamentos inseridos manualmente com a mesma chave, eles continuam preservados (não são sobrescritos).
4. **Quem é afetado:** Todos os tenants que importam processos via OAB. Especialmente quem teve importações com "0 andamentos" silenciosos no passado — após o fix, podem clicar em "Reprocessar resumo" e popular sem custo.

## Validação
1. Deploy da edge.
2. No processo `0123417-95.2025.8.16.0000`, clicar em **Reprocessar resumo** (modo cache, sem cobrança no Escavador).
3. Logs devem mostrar `OAB ...: 18 novos andamentos` (ou similar) e zero erros silenciosos.
4. `SELECT count(*) FROM processos_oab_andamentos WHERE processo_oab_id = '6a06...4b17b1'` deve retornar 18.
5. Aba **Andamentos** na ficha do processo deve listar as 18 movimentações.
6. Reprocessar de novo: `count` continua 18 (idempotência confirmada).
7. Importar um processo novo do zero (outro CNJ): capa + andamentos vêm na mesma operação.

Confirma para eu implementar?
