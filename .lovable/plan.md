## Reorganização do menu do Planejador

### Mudanças solicitadas
1. Renomear a aba **"Colunas"** → **"Tarefas"** (continua sendo o Kanban atual).
2. Adicionar nova aba **"Hello"** (visão mista: tarefas + prazos juntos).
3. Reordenar o menu underline para: **Hello | Prazos | Tarefas | Lista | Calendário**.
4. Quando estiver em **Hello**, o botão **"Criar"** vira um dropdown com duas opções: **Prazo** e **Tarefa**.

### Como funcionará a aba "Hello" (mista)
Layout em colunas no mesmo estilo da aba Prazos, agrupando por janela temporal:
- **Vencido** | **Hoje** | **Esta Semana** | **Próxima Semana** | **Futuro** | **Concluído**

Cada coluna mostra cards de:
- **Tarefas** do planejador (com badge/ícone `LayoutGrid` indicando "Tarefa")
- **Prazos** da agenda (com badge/ícone `Clock` indicando "Prazo")

Ordenação dentro de cada coluna: por data ascendente; itens sem data vão ao final. Clicar em um card:
- Tarefa → abre `PlanejadorTaskDetail` (mesmo fluxo da aba Tarefas).
- Prazo → abre `DeadlineDetailDialog` (mesmo fluxo da aba Prazos).

Filtros (Minhas/Todos/usuário específico, busca) aplicam-se aos dois tipos da mesma forma já usada nas abas existentes. Marcadores só afetam tarefas (prazos não têm marcadores do planejador).

### Comportamento do botão "Criar"
- Em **Hello**: dropdown com `Tarefa` (abre `PlanejadorCreateTask`) e `Prazo` (abre `CreateDeadlineDialog`).
- Em **Tarefas / Lista / Calendário**: abre `PlanejadorCreateTask` (como hoje).
- Em **Prazos**: abre `CreateDeadlineDialog` (como hoje).

### Arquivos afetados
- `src/components/Planejador/PlanejadorTopBar.tsx`
  - Renomear `prazo` → label "Tarefas" no array `TABS`.
  - Adicionar `{ id: 'hello', label: 'Hello' }` no início.
  - Reordenar: `['hello', 'prazos', 'prazo', 'lista', 'calendario']`.
  - Transformar o botão "Criar" em `DropdownMenu` quando `activeTab === 'hello'` (versão mobile + desktop).
- `src/components/Planejador/PlanejadorHelloView.tsx` *(novo)*
  - Combina tarefas (de `usePlanejadorTasks`) e prazos (de `useAgendaData`) nas 6 colunas temporais. Reaproveita estilos das colunas de `PlanejadorPrazosView`.
- `src/components/Planejador/PlanejadorDrawer.tsx`
  - Adicionar branch `activeTab === 'hello'` que renderiza `PlanejadorHelloView`, passando handlers para abrir tarefa (`handleSelectTask`) e prazo (`setDeadlineDetailId` + `setDeadlineDetailOpen`).
  - Tornar tab inicial = `'hello'` (substitui o `'prazo'` atual como padrão).

### Impacto
- **Usuário final (UX):** ao abrir o Planejador, a primeira tela passa a ser "Hello" (visão consolidada). A aba "Colunas" muda de nome para "Tarefas" (mesma funcionalidade). Ganha um botão "Criar" inteligente que pergunta tipo só na Hello.
- **Dados:** nenhuma mudança de schema, migration ou RLS. Apenas leitura combinada de tabelas já existentes (`planejador_tasks` + deadlines da agenda).
- **Riscos colaterais:** mudar a aba default de `prazo` → `hello` pode surpreender usuários acostumados ao Kanban; se preferir manter `prazo` como padrão é só não trocar. localStorage de colunas do Kanban (`planejador-column-config-v2-*`) não é afetado.
- **Quem é afetado:** todos os usuários de todos os tenants que usam o Planejador.

### Validação
1. Abrir Planejador → aba "Hello" ativa, mostrando colunas Vencido/Hoje/Esta Semana/Próxima Semana/Futuro/Concluído com tarefas E prazos misturados.
2. Clicar em uma tarefa → abre detalhe da tarefa. Clicar em prazo → abre detalhe do prazo.
3. Em Hello, clicar "Criar" → dropdown com "Tarefa" e "Prazo"; cada opção abre o dialog correspondente.
4. Mudar para "Tarefas" (antiga "Colunas") → Kanban funciona normalmente, label atualizado.
5. Filtros Minhas/Todos/usuário e busca funcionam em Hello para os dois tipos.
6. Ordem dos tabs visível: Hello → Prazos → Tarefas → Lista → Calendário.
