# Corrigir timeout ao carregar processos da OAB

## Causa raiz

O hook `useProcessosOAB` (em `src/hooks/useOABs.ts`, linhas ~349-396) carrega TODOS os processos de uma OAB com um LEFT JOIN pesado em `processos_oab_andamentos`, paginando via `fetchAllPaginated`. Para OABs com 170+ processos e milhares de andamentos cada, o Postgres aborta a consulta com:

> canceling statement due to statement timeout

Esse hook é usado nas abas de OAB da Controladoria (a aba `111056/PR` no screenshot).

## Correção

Quebrar a consulta única em duas consultas leves e paralelas, eliminando o JOIN:

1. **Lista de processos** — `SELECT * FROM processos_oab WHERE oab_id = ?` (sem join, com `fetchAllPaginated`).
2. **Contagem de não lidos** — reaproveitar o RPC já existente `get_andamentos_nao_lidos_por_processo(p_tenant_id)` (usado em `useAllProcessosOAB`) e filtrar no cliente pelos `processo_oab_id` da OAB atual.

Executar as duas em `Promise.all`, depois fazer o merge em memória (mapa por `processo_id`).

Fallback sutil: se o RPC falhar, ainda exibimos a lista de processos com `andamentos_nao_lidos = 0` em vez de mostrar toast de erro vermelho — o usuário consegue trabalhar.

## Arquivos afetados

- `src/hooks/useOABs.ts` — refatorar `useProcessosOAB.fetchProcessos` (única mudança).

Nenhuma migração SQL, nenhum componente de UI, nenhuma alteração de RLS — o RPC já existe e respeita tenant.

## Impacto

1. **Usuário final (UX):** aba da OAB carrega rápido e sem o toast vermelho "canceling statement…". Visualmente idêntico (mesma tabela, mesmos badges de não-lidos).
2. **Dados:** nenhuma mudança de schema, migration ou RLS. Apenas troca o padrão de leitura (1 query pesada → 2 queries leves).
3. **Riscos colaterais:** baixo. O RPC `get_andamentos_nao_lidos_por_processo` já é usado em produção pelo `useAllProcessosOAB`, então sabemos que é performático.
4. **Quem é afetado:** qualquer tenant que abra a aba de uma OAB na Controladoria — principal beneficiado: Alan (OAB 111056/PR com 172 processos).

## Validação

1. Abrir Controladoria → aba `111056/PR` no tenant do Alan: deve carregar sem toast vermelho.
2. Confirmar que o badge de "andamentos não lidos" continua aparecendo nos processos certos.
3. Testar uma OAB pequena (ex.: 92124/PR com 101 processos) para garantir que não houve regressão.
