
## Abrir Drawer da Agenda ao clicar em Prazos no Dashboard

### Problema

Quando o usuario clica em um prazo na secao "Minhas Tarefas e Prazos" do Dashboard, o sistema navega para a pagina `/agenda`. O comportamento desejado e abrir o **Drawer lateral da Agenda** (que ja existe no sistema), mantendo o usuario no Dashboard.

### Solucao

Adicionar uma prop `onOpenAgendaDrawer` ao componente `PrazosAbertosPanel` para que, ao clicar em um prazo individual, o Drawer da Agenda seja aberto em vez de navegar para a pagina. O botao "Ver todos na Agenda" no rodape continuara navegando para a pagina completa.

### Mudancas tecnicas

**1. `src/components/Dashboard/PrazosAbertosPanel.tsx`**

- Adicionar prop opcional `onOpenAgendaDrawer?: () => void` na interface
- No `onClick` de cada item de prazo (linha 352), chamar `onOpenAgendaDrawer` em vez de `handleNavigateToAgenda`
- Manter o botao "Ver todos na Agenda" (linha 392) navegando para a pagina normalmente

**2. `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx`**

- Adicionar estado local `agendaDrawerOpen` e o componente `AgendaDrawer`
- Passar `onOpenAgendaDrawer` para o `PrazosAbertosPanel`

**3. `src/components/Dashboard/Metrics/AdminMetrics.tsx`**

- Mesmo ajuste: estado local para o drawer e passar a callback ao `PrazosAbertosPanel`

### Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/Dashboard/PrazosAbertosPanel.tsx` | Adicionar prop `onOpenAgendaDrawer` e usar no click dos prazos |
| `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx` | Adicionar estado e renderizar `AgendaDrawer`, passar callback |
| `src/components/Dashboard/Metrics/AdminMetrics.tsx` | Adicionar estado e renderizar `AgendaDrawer`, passar callback |
