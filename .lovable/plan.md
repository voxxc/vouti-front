# Planejador no mobile + redesign mobile

## Causa raiz

1. **Acesso ausente no mobile**: a `DashboardSidebar` é escondida em telas `< md` (`-translate-x-full md:translate-x-0`) e o `MobileBottomNav` (que a substitui) **não lista o Planejador** — nem em `PRIMARY_TABS` nem em `MORE_ITEMS`. Por isso o usuário não consegue abrir o drawer no celular.
2. **Layout do Planejador não é responsivo**: `PlanejadorDrawer` usa `side="inset"` (drawer lateral grande), `PlanejadorTopBar` empilha tudo numa única linha horizontal com input de busca de `w-64`, filtros "Minhas/Todos", dropdown de usuário, dropdown de marcadores, settings, lock, search e close — tudo isso quebra brutalmente em 390px. O `PlanejadorKanban` mostra colunas de `w-72` lado a lado com scroll horizontal, mas o overhead do header consome quase toda a tela vertical.

## Correção

### 1. Adicionar Planejador ao menu mobile
- Em `MobileBottomNav.tsx`: incluir `{ id: 'planejador', icon: LayoutGrid, label: 'Planejador' }` em `MORE_ITEMS` (entre Projetos e Clientes ou logo após Documentos — fica no sheet "Mais"). 
- Liberar acesso em `hasAccessToItem`: tratar `'planejador'` como sempre visível (igual ao sidebar desktop linha 122).

### 2. Drawer fullscreen no mobile
Em `PlanejadorDrawer.tsx`:
- Detectar mobile com `useIsMobile()`.
- Quando mobile: forçar `isExpanded = true` por padrão e esconder o botão de expandir/recolher.
- Trocar o background heavy (space-bg/sky-light-bg) por um background sólido (`bg-background`) no mobile — a imagem + blur prejudica performance e legibilidade em telas pequenas.
- Reduzir paddings: `px-6 pt-5` → `px-3 pt-3` no mobile.

### 3. TopBar mobile (`PlanejadorTopBar.tsx`)
Reorganizar em 3 linhas compactas quando mobile:
- **Linha 1 (header)**: ícone + "Planejador" à esquerda, botões `Settings`, `Lock`, `Close` à direita (ícones 32x32). Remover o `pl-6`.
- **Linha 2 (ações)**: botão "Criar" (full-width grande) + ícone de busca que expande input ao tocar (ou input compacto em `flex-1`).
- **Linha 3 (filtros)**: toggle "Minhas/Todos" + dropdown usuário + dropdown marcadores, lado a lado em `flex gap-2` com `text-xs`.
- **Tabs**: já estão em `flex gap-1`, adicionar `overflow-x-auto snap-x` e reduzir `px-4` para `px-3` no mobile.

### 4. Kanban mobile (`PlanejadorKanban.tsx`)
- Largura das colunas: `w-72` → `w-[85vw] max-w-72` no mobile, com `snap-x snap-mandatory` no container para que o usuário deslize coluna por coluna.
- Padding interno das colunas (`p-2.5`) → `p-2` mobile.
- Header das colunas (bolinha + label + contador) mantém o layout — já é compacto.

### 5. Outras views (Lista, Prazos)
- `PlanejadorListView` e `PlanejadorPrazosView` já são listas verticais; só garantir que `px-6 pb-4` do container externo vire `px-3 pb-3` no mobile (feito no item 2).

## Arquivos afetados

- `src/components/Dashboard/MobileBottomNav.tsx` — adicionar item Planejador
- `src/components/Planejador/PlanejadorDrawer.tsx` — fullscreen mobile, paddings, bg
- `src/components/Planejador/PlanejadorTopBar.tsx` — reorganização responsiva (3 linhas no mobile)
- `src/components/Planejador/PlanejadorKanban.tsx` — colunas em `w-[85vw]` + snap

## Impacto

- **Usuário final (UX)**: usuários mobile finalmente conseguem acessar o Planejador pelo botão "Mais" da bottom nav. O drawer abre em tela cheia, com TopBar reorganizada em 3 linhas (sem espremer 8 controles numa linha só), Kanban com swipe coluna-a-coluna (snap), e busca/filtros legíveis. Desktop continua exatamente igual.
- **Dados (migrations, RLS, performance)**: nenhuma. Mudanças puramente de UI/responsividade. Performance melhora levemente no mobile ao remover background-image + blur.
- **Riscos colaterais**: baixo. As alterações no `PlanejadorTopBar` precisam preservar TODOS os controles existentes (criar, filtros usuário, marcadores, settings, lock, busca, fechar, tabs) — apenas reorganizando layout. Listas (Lista/Prazos) e detalhes de tarefa (`PlanejadorTaskDetail`) não são tocados nesta rodada — se houver problema mobile neles, será uma rodada separada.
- **Quem é afetado**: todos os tenants (recurso é global), em particular usuários mobile com roles que têm acesso ao Planejador (todos, pois o item é tratado como sempre visível). Desktop intacto.

## Validação

1. Mobile 390px: abrir → tocar "Mais" na bottom nav → ver "Planejador" → tocar → drawer abre fullscreen → header organizado em 3 linhas → trocar entre tabs → no Kanban deslizar lateralmente coluna a coluna com snap.
2. Desktop ≥768px: comportamento idêntico ao atual (drawer lateral, TopBar em uma linha).
3. Confirmar que filtros (Minhas/Todos/usuário/marcadores), busca, lock e settings continuam funcionais no mobile.
