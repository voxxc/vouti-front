

## Plano: Cards de prazo abrem o Drawer da Agenda

### Situacao atual

No `PrazosAbertosPanel.tsx`, existem 3 abas de tarefas/prazos:

- **Prazos** (linha 353): Ao clicar, ja chama `onOpenAgendaDrawer` (que abre o drawer da agenda). Isso ja funciona.
- **Admin** (linha 442/543): Ao clicar, chama `handleNavigateToProjetos` — navega para `/projects`.
- **Juridico** (linha 442/554): Ao clicar, chama `handleNavigateToControladoria` — navega para `/controladoria`.

### O que muda

Alterar o `onClick` dos cards nas abas **Admin** e **Juridico** para tambem abrir o drawer da agenda, igual a aba Prazos.

### Alteracoes

**Arquivo**: `src/components/Dashboard/PrazosAbertosPanel.tsx`

1. **Aba Admin** (linha 543): Trocar `handleNavigateToProjetos` por `onOpenAgendaDrawer || handleNavigateToProjetos` no `onNavigate` passado ao `renderTarefasList`

2. **Aba Juridico** (linha 554): Trocar `handleNavigateToControladoria` por `onOpenAgendaDrawer || handleNavigateToControladoria` no `onNavigate` passado ao `renderTarefasList`

Os botoes "Ver todos os projetos" e "Ver controladoria" no rodape de cada aba continuam navegando normalmente — so o clique nos cards individuais muda.

### Detalhe tecnico

A funcao `renderTarefasList` recebe `onNavigate` como parametro e usa tanto no `onClick` dos cards (linha 442) quanto no botao do rodape (linha 482). Para diferenciar, sera necessario passar dois callbacks separados: um para o card (abre drawer) e outro para o botao do rodape (navega para a pagina). Isso requer um pequeno ajuste na assinatura de `renderTarefasList` para aceitar `onCardClick` e `onFooterNavigate` separadamente.

