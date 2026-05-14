# Cabeçalhos clicáveis com ordenação

## Causa raiz
A tabela de `PrazosOrfaosTab` renderiza colunas fixas (`Nº`, `Título`, `Data`, `Projeto / Workspace`, `Criador`, `Responsável`, `Status`) sem interação de ordenação. Hoje só há ordenação implícita por `created_at desc` no fetch.

## Correção
Em `src/components/Controladoria/PrazosOrfaosTab.tsx`:

1. Adicionar estado de ordenação:
   - `sortKey: 'number' | 'title' | 'date' | 'project' | 'creator' | 'responsavel' | 'status'`
   - `sortDir: 'asc' | 'desc'`
   - Padrão: `date` / `desc`.

2. Transformar cada `<TableHead>` (exceto "Ações") em botão clicável:
   - `cursor-pointer select-none hover:text-foreground`
   - Ao clicar: se já está naquela coluna, inverte a direção; senão troca de coluna e usa `asc` (texto) ou `desc` (data/número).
   - Ícone à direita do label: `ArrowUp`/`ArrowDown` quando ativa; `ArrowUpDown` neutro quando inativa (lucide-react).

3. Aplicar ordenação no `filteredRows` via novo `useMemo` `sortedRows`:
   - `number` → `deadline_number` numérico (nulls no fim).
   - `title` → `localeCompare` em pt-BR, case-insensitive.
   - `date` → comparar `parseLocalDate(row.date).getTime()`.
   - `project` → `project_name` (fallback workspace) via `localeCompare`.
   - `creator` → `creator_name`.
   - `responsavel` → `responsavel_name`.
   - `status` → boolean `completed` (pendentes primeiro em `asc`).
   - Strings vazias/null sempre no final, independente da direção.

4. Renderizar `sortedRows` no `<TableBody>` no lugar de `filteredRows`.

## Arquivos afetados
- `src/components/Controladoria/PrazosOrfaosTab.tsx` (único arquivo)

## Impacto
1. **Usuário final**: cada cabeçalho da tabela em `/:tenant/prazoof` vira clicável, com seta indicando direção. Permite ordenar por qualquer coluna asc/desc. Botão "Vincular" e área de ações permanecem inalterados; clicar na linha continua abrindo o `DeadlineDetailDialog`.
2. **Dados**: nenhuma alteração. Ordenação é puramente client-side sobre `rows` já carregados; sem novas queries, migrations ou RLS.
3. **Riscos colaterais**: mínimos. O `useMemo` evita recomputar a cada render. Linhas com valores nulos ficam sempre ao final para não "sumirem" entre páginas.
4. **Quem é afetado**: somente quem acessa a aba/página de Prazos OF (controladoria). Nenhum outro módulo é tocado.

## Validação
- Clicar em "Título" → linhas em ordem alfabética; clicar de novo → ordem inversa; seta muda.
- Clicar em "Data" → ordem cronológica desc/asc bate com `dd/MM/yyyy` exibida.
- Clicar em "Nº" → numérico crescente/decrescente; nulos ao final.
- Clicar em "Status" → "Pendente" agrupa antes/depois de "Concluído".
- Clicar na linha continua abrindo o modal de detalhe; "Vincular" e "Excluir" continuam funcionando sem disparar o modal.
- Filtros (busca, criador, projeto) seguem operando antes da ordenação.
