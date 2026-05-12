---
name: Supabase 1000 row limit
description: Toda listagem deve usar fetchAllPaginated, .range() ou .limit() explícito; nunca confiar no retorno padrão (cap implícito de 1000)
type: constraint
---
Supabase aplica limite implícito de 1000 linhas em SELECTs sem `.limit()` ou `.range()`. Isso causa sumiço silencioso de dados quando a tabela cresce (ex.: prazo do Alan sumindo da Agenda quando deadlines do tenant ultrapassaram 1000).

Regras:
- Para "todos os registros visíveis pela RLS": usar `fetchAllPaginated(() => builder)` de `@/lib/supabasePagination`.
- Para janelas explícitas (últimas N): usar `.limit(N)` explícito e justificar.
- Para apenas contagem: usar `.select('id', { count: 'exact', head: true })` em vez de baixar linhas e contar no JS.
- Nunca fazer `.from('x').select('*').eq(...)` sem um dos três acima quando o resultado pode ultrapassar 1000.

Tabelas de risco confirmado: deadlines, processos_oab_andamentos, whatsapp_messages, project_protocolo_etapas, processos_oab, project_protocolos.
