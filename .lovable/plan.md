# Plano: Processos "Apartados" em Andamentos Não Lidos

## Causa raiz
Hoje não existe forma de sinalizar um processo OAB como "apartado" e separar suas atualizações na Central de Andamentos Não Lidos. Você precisa de:
1. Um toggle no detalhe do processo para marcá-lo como apartado.
2. Um filtro/aba "Apartados" na Central de Andamentos Não Lidos que mostre apenas esses processos.
3. Visibilidade restrita ao usuário Daniel (super_admin) num primeiro momento.

## Correção

### 1. Banco de dados (migration)
- Adicionar coluna `apartado BOOLEAN NOT NULL DEFAULT false` em `processos_oab`.
- Adicionar `apartado_em TIMESTAMPTZ NULL` e `apartado_por UUID NULL` (referência a profile) para auditoria simples de quem marcou e quando.
- Índice parcial `CREATE INDEX ... ON processos_oab (tenant_id) WHERE apartado = true` para acelerar o filtro.
- Atualizar a RPC `get_central_andamentos_nao_lidos` para também retornar a coluna `apartado` (sem mudar o filtro — continua trazendo todos os processos com não lidos; o filtro acontece no frontend).
- Sem mudança em RLS (a coluna herda das policies existentes).

### 2. Gate de visibilidade ("apenas Daniel")
- Criar helper SQL `public.can_use_apartados(_user_id uuid) returns boolean` que hoje retorna `true` apenas para `user_id = '8eda80fa-0319-4791-923e-551052282e62'` (Daniel de Morais, super_admin). Quando você liberar para admins/controllers, basta editar essa função (zero alteração de UI).
- No frontend, hook `useCanUseApartados()` chama a função uma vez e expõe `boolean`.
- O toggle no detalhe do processo e a opção "Apartados" no filtro só aparecem quando `canUseApartados === true`.

### 3. UI — Detalhe do processo (`ProcessoOABDetalhes.tsx`)
- Acima do `AutomacaoPrazosCard` (linha ~1150), inserir um novo bloco `ApartadoCard`:
  - Switch "Marcar como apartado" + descrição curta.
  - Quando ligado: badge "Apartado desde DD/MM/AAAA por <nome>".
  - Update em `processos_oab` com `apartado`, `apartado_em = now()`, `apartado_por = auth.uid()`.
- Renderização condicionada a `canUseApartados`.

### 4. UI — Central de Andamentos Não Lidos (`CentralAndamentosNaoLidos.tsx`)
- Novo estado `filterApartado: 'todos' | 'apartados' | 'nao_apartados'` (default `'todos'`).
- Adicionar um `Select` ao lado do filtro de OAB com as opções acima (visível só se `canUseApartados`).
- Aplicar filtro em `filteredProcessos` usando o campo `apartado` retornado pela RPC.
- Coluna extra opcional na tabela com um ícone/badge "Apartado" quando aplicável (visível só para quem pode usar).
- Atualizar `useAndamentosNaoLidosGlobal` e `ProcessoComNaoLidos` para incluir `apartado: boolean`.

## Arquivos afetados
- `supabase/migrations/<nova>.sql` — coluna + função `can_use_apartados` + RPC atualizada.
- `src/hooks/useAndamentosNaoLidosGlobal.ts` — incluir `apartado` no tipo e mapeamento.
- `src/hooks/useCanUseApartados.ts` — novo hook.
- `src/components/Controladoria/CentralAndamentosNaoLidos.tsx` — filtro "Apartados" + coluna.
- `src/components/Controladoria/ApartadoCard.tsx` — novo, com switch.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — inserção acima do `AutomacaoPrazosCard`.

## Impacto
1. **Usuário final (UX):**
   - Daniel: passa a ver um switch "Marcar como apartado" no detalhe de cada processo OAB e um filtro "Apartados/Não apartados/Todos" na Central. Demais usuários: nenhuma mudança visível.
   - Quando liberar para admins/controllers no futuro: basta editar `can_use_apartados` — nada na UI precisa mudar.
2. **Dados:**
   - Migration adiciona 3 colunas em `processos_oab` com defaults seguros (sem backfill). Sem reescrita de linhas grandes.
   - Índice parcial pequeno (só linhas com `apartado=true`).
   - RPC ganha um campo a mais no retorno — payload aumenta marginalmente.
3. **Riscos colaterais:**
   - Baixos. A RPC já existe e é só `SELECT` adicional; a coluna nova com default `false` não quebra inserts existentes.
   - Hook `useCanUseApartados` faz 1 chamada por sessão — irrelevante.
4. **Quem é afetado:**
   - Imediato: apenas Daniel (super_admin), em todos os tenants onde ele tem acesso.
   - Demais usuários e tenants: zero impacto até você liberar a função `can_use_apartados`.

## Validação
- Após migration: verificar via SQL que `processos_oab.apartado` existe e que `SELECT can_use_apartados('8eda80fa-...')` retorna `true` e qualquer outro UUID retorna `false`.
- Logar como Daniel: abrir detalhe de um processo OAB, ligar o toggle, conferir badge e persistência após reload.
- Na Central: filtrar por "Apartados" e confirmar que só os marcados aparecem; filtrar por "Não apartados" e por "Todos".
- Logar como outro usuário (não-super_admin): confirmar que nem o switch nem o filtro aparecem.
