

## Redesign Mobile: Agenda e Controladoria

### Problemas Identificados

**Agenda:**
1. Layout de duas colunas (`lg:flex-row`) — no mobile, calendário + lista ficam empilhados mas o calendário (`lg:w-[670px]`) consome toda a tela
2. Header com filtro de usuário + search + botão "Novo Prazo" em linha horizontal — não cabe no mobile
3. DeadlineRow tem muitos elementos em linha (dot + title + date + badge + actions) — overflow no mobile
4. Drawer sem botão X visível (o X do SheetContent está posicionado em `right-4 top-4` mas pode ficar atrás do header sticky)

**Controladoria:**
1. Metrics grid `grid-cols-5` — no mobile `grid-cols-1` já funciona mas com muito padding
2. OABManager toolbar (`flex items-center justify-between`) — botões "Importar CNJ" + "Excluir" sobrepõem texto no mobile
3. ProcessoCard — CNJ number + badges em `flex-wrap` ficam apertados
4. ProcessoOABDetalhes — TabsList com `grid-cols-7` (7 abas!) comprime texto e sobrepõe
5. Drawer do ProcessoOABDetalhes usa `sm:max-w-xl` — no mobile <640px fica `w-full` mas padding interno gera overflow

### Alterações

| Arquivo | Mudança |
|---------|---------|
| `AgendaContent.tsx` | Mobile: filtro empilhado, calendário colapsável, DeadlineRow simplificado |
| `AgendaDrawer.tsx` | Header com padding ajustado para X ficar visível |
| `ControladoriaContent.tsx` | Título menor no mobile, metrics grid `grid-cols-2` no mobile |
| `OABManager.tsx` | Toolbar empilhada no mobile, botões em linha separada |
| `OABTab.tsx` | ProcessoCard: badges em nova linha no mobile, actions compactos |
| `ProcessoOABDetalhes.tsx` | TabsList: `grid-cols-4` + segunda linha no mobile OU overflow-x scroll |

### Detalhes Técnicos

**AgendaContent.tsx:**
- Filtro: `flex-col md:flex-row` no wrapper de filtro+search+button
- Select de usuário: `w-full md:w-64`
- Search: `max-w-full md:max-w-md`
- Calendário: esconder no mobile com toggle, ou tornar menor
- DeadlineRow: esconder Badge de status no mobile (`hidden md:inline-flex`), date em nova linha

**ProcessoOABDetalhes.tsx (problema principal de sobreposição):**
- TabsList `grid-cols-7` -> `flex overflow-x-auto` com scroll horizontal no mobile
- Ou dividir em duas linhas: `grid grid-cols-4 md:grid-cols-7` com tabs wrapping
- Cada TabsTrigger: `text-xs md:text-sm`, padding reduzido

**OABManager toolbar (linhas 325-367):**
- Wrapper: `flex flex-col gap-2 md:flex-row md:items-center md:justify-between`
- Botões: `flex flex-wrap gap-1`

**ControladoriaContent.tsx:**
- Título: `text-2xl md:text-3xl`
- Metrics grid: `grid-cols-2 md:grid-cols-2 lg:grid-cols-5`

**AgendaDrawer.tsx:**
- Header padding: `px-4 md:px-6` para dar espaço ao X
- Conteúdo: `p-4 md:p-6`

Todas as mudanças usam breakpoints responsivos — zero impacto no desktop.

