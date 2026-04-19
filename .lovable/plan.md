

## Manter drawer aberto durante interações no topbar

### Causa raiz

Os drawers usam `<Sheet modal={false}>` (Radix Dialog). Mesmo em modo não-modal, o Radix dispara `onPointerDownOutside`/`onInteractOutside` quando você clica em qualquer elemento fora do `SheetContent` — incluindo botões do topbar (theme toggle, sino, chat interno, busca, perfil, sair). O comportamento padrão desses eventos é fechar o drawer.

Apenas `ProjectDrawer` e `PlanejadorDrawer` interceptam esses eventos com `e.preventDefault()`. Os demais 8 drawers fecham ao primeiro clique no topbar.

Além disso, popovers/menus do topbar (DropdownMenu do tema, popover do sino, dialog do chat interno) precisam continuar funcionando — eles usam Portals, então o clique neles também conta como "outside" do drawer.

### Correção

**1. Padronizar todos os drawers `side="inset"` para ignorar cliques fora**

Adicionar nos drawers que ainda não têm:
```tsx
onInteractOutside={(e) => e.preventDefault()}
onPointerDownOutside={(e) => e.preventDefault()}
```

Drawers afetados:
- `src/components/CRM/CRMDrawer.tsx`
- `src/components/Financial/FinancialDrawer.tsx`
- `src/components/Agenda/AgendaDrawer.tsx`
- `src/components/Reunioes/ReunioesDrawer.tsx`
- `src/components/Extras/ExtrasDrawer.tsx`
- `src/components/Controladoria/ControladoriaDrawer.tsx`
- `src/components/Publicacoes/PublicacoesDrawer.tsx` (2 SheetContent)
- `src/components/WhatsApp/WhatsAppDrawer.tsx`

`ProjectDrawer` e `PlanejadorDrawer` já estão corretos — não mexer.

**2. Manter ESC funcionando** (fecha drawer com tecla) — não interceptar `onEscapeKeyDown`. Botão X do header e ações explícitas continuam fechando normalmente via `onOpenChange(false)`.

**3. Popovers/menus do topbar** (ThemeToggle DropdownMenu, sino CRMNotificationsBell, chat interno, busca CRMQuickSearch) — já usam Portal do Radix, renderizam acima do drawer. Como o `preventDefault` impede o close do drawer, eles abrirão normalmente sobrepostos.

### Arquivos afetados
- 8 arquivos de drawer (apenas adição de 2 props no `SheetContent`)

### Impacto

- **UX (usuário final)**: drawer abre uma vez e permanece aberto até o usuário clicar no X ou pressionar ESC. Trocar tema, ver notificações, abrir chat interno, fazer busca, fazer logout — tudo isso passa a funcionar sem fechar o drawer ativo. Comportamento consistente entre todos os módulos (CRM, Financial, Agenda, Reuniões, Extras, Controladoria, Publicações, WhatsApp).
- **Dados**: zero. Apenas comportamento de UI.
- **Performance**: nenhuma.
- **Riscos colaterais**: 
  - Usuários acostumados a "clicar fora pra fechar" precisarão usar X ou ESC. Mitigado: ESC continua fechando.
  - Em mobile, comportamento idêntico — drawer ocupa quase tela toda, X já é a forma natural de fechar.
- **Quem é afetado**: todos os usuários de todos os tenants em todos os roles.

### Validação

1. Abrir qualquer drawer (ex.: CRM, Financial, Agenda) em `/solvenza/dashboard`.
2. Clicar no theme toggle do topbar → tema muda, drawer permanece aberto, dropdown do tema aparece por cima.
3. Clicar no sino de notificações → popover abre, drawer continua aberto.
4. Clicar no ícone de chat interno → modal abre por cima, drawer continua aberto.
5. Clicar na busca rápida → resultados aparecem, drawer permanece.
6. Pressionar ESC → drawer fecha (comportamento esperado).
7. Clicar no X do header do drawer → drawer fecha.
8. Repetir em mobile (viewport <768px) → mesmo comportamento.

