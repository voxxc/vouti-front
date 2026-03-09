

## Redesign Mobile do Dashboard

### Problemas Identificados

1. **Sidebar como hamburger menu** — no mobile, o usuário precisa abrir um menu lateral para navegar. Isso é lento e pouco intuitivo para um app usado com frequência.
2. **Header com muito padding** — `px-6` e `h-[49px]` sem adaptação mobile. Ferramentas ficam apertadas.
3. **Conteúdo com espaçamento excessivo** — `px-6 py-8` no main, cards com gaps grandes no mobile.
4. **Sem bottom navigation** — padrão mobile moderno é ter as seções principais na parte inferior da tela.
5. **Drawers posicionados com `top-[57px]`** — precisa ajustar quando header muda no mobile.

### Solução

Criar uma **barra de navegação inferior (bottom tab bar)** no mobile com as seções mais usadas, esconder o sidebar hamburger, e ajustar espaçamentos.

### Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/components/Dashboard/MobileBottomNav.tsx` | **NOVO** — Bottom tab bar com 5 ícones principais + "Mais" |
| `src/components/Dashboard/DashboardSidebar.tsx` | Esconder botão hamburger no mobile (bottom nav substitui) |
| `src/components/Dashboard/DashboardLayout.tsx` | Adicionar `MobileBottomNav`, ajustar padding mobile no header e main, adicionar `pb-20` no mobile para não cobrir conteúdo |
| `src/index.css` | Adicionar utilitários para safe-area-inset (notch do iPhone) |
| `src/components/ui/sheet.tsx` | Ajustar variante `inset` para `top-0` no mobile (bottom nav em vez de header) |

### Bottom Nav — Estrutura

```text
┌──────────────────────────────────────┐
│  [Dashboard] [Projetos] [Agenda]     │
│  [Controladoria] [Mais ▼]           │
└──────────────────────────────────────┘
```

- 5 tabs fixas: Dashboard, Projetos, Agenda, Controladoria, Mais
- "Mais" abre um sheet com os demais itens (Financeiro, Clientes, Documentos, Reuniões, etc.)
- Ícone + label pequena abaixo
- `fixed bottom-0` com `z-50`, `backdrop-blur`, borda superior
- Só aparece em `md:hidden`

### Ajustes de espaçamento mobile

- Header: `px-6` → `px-3 md:px-6`, esconder elementos não essenciais
- Main: `px-6 py-8` → `px-3 py-4 md:px-6 md:py-8`
- Adicionar `pb-20 md:pb-8` no main para compensar bottom nav
- Cards grids: já usam `grid-cols-1` no mobile, apenas reduzir gaps

### Drawers no mobile

O `side="inset"` já usa `left-0 right-0` no mobile. Ajustar `top-0` no mobile (full screen) em vez de `top-[57px]`, com o header do drawer sendo o único header visível.

### Segurança

Nenhuma alteração na versão desktop. Todas as mudanças são condicionais com `md:` breakpoints ou componentes `md:hidden`.

