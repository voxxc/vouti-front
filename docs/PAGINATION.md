# Padrão de Paginação para SELECTs Supabase

## Por que isso importa

O Supabase impõe um limite **implícito de 1.000 linhas** em qualquer
`select()` sem `.limit()` ou `.range()`. Em tenants pequenos isso passa
despercebido, mas em tenants grandes (Solvenza, Mercado Galvão) registros
somem silenciosamente — sem erro, sem aviso. Carteiras vazias, processos
faltando em listagens, contadores errados — todos sintomas do mesmo bug.

## Regra de ouro

> Toda listagem cujo objetivo é "todos os registros visíveis pela RLS"
> DEVE usar `fetchAllPaginated` ou `fetchAllPaginatedIn` de
> `@/lib/supabasePagination`.

Use `.limit(N)` apenas quando você intencionalmente quer uma janela
limitada (ex.: últimas 200 mensagens, top 10 leads). Use `.single()` /
`.maybeSingle()` para 1 linha.

## Como aplicar

```ts
import { fetchAllPaginated, fetchAllPaginatedIn } from '@/lib/supabasePagination';

// Listagem completa
const { data, error } = await fetchAllPaginated<Deadline>(() =>
  supabase.from('deadlines').select('*').eq('tenant_id', tid).order('id')
);

// SELECT ... WHERE col IN (...muitos ids)
const { data, error } = await fetchAllPaginatedIn<Processo>(ids, (chunk) =>
  supabase.from('processos_oab').select('id, numero_cnj').in('id', chunk)
);
```

Pontos importantes:
- **Sempre** passe uma factory `() => builder` — builders supabase-js NÃO
  são reutilizáveis após `await`.
- Sempre inclua `.order(...)` para garantir paginação estável.
- `hardCap` default = 50 páginas (50k linhas). Aumente se realmente
  esperar volumes maiores.

## Guarda preventiva

Rode localmente ou em CI:

```bash
node scripts/check-pagination.mjs
```

O script varre `src/` e falha se encontrar `.from(...).select(...)` sem
`fetchAllPaginated*`, `.limit`, `.range`, `.single` ou `.maybeSingle`.

## Auditoria de carteiras (Fase 1)

Carteiras de processos (`project_carteira_processos`) hoje são protegidas
por:
- FK `ON DELETE RESTRICT` para impedir cascatas silenciosas
- Tabela `project_carteira_processos_audit` que registra todo
  insert/delete + cascatas históricas
- Trigger de backfill para órfãos

A timeline está visível em **Super-Admin → Operações → Auditoria
Carteiras**.