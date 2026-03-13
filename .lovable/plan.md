
Problema identificado:
- O clique no “Dashboard” hoje limpa apenas `activeDrawer`.
- Alguns drawers são controlados por outros estados (principalmente `projectDrawerOpen` no `DashboardLayout`), então “às vezes” o drawer continua aberto mesmo voltando para `/dashboard`.

Plano de correção:
1) Centralizar o “reset de dashboard” no `DashboardLayout`
- Criar um handler único para o clique de Dashboard que:
  - `setActiveDrawer(null)`
  - `setProjectDrawerOpen(false)`
  - `setSelectedProjectId(null)` (para não reabrir detalhe antigo)

2) Garantir que todos os atalhos de Dashboard usem esse handler
- Sidebar (já chama `onDrawerChange(null)`) passará por esse reset central no layout.
- MobileBottomNav: trocar o callback atual (`setActiveDrawer(null)`) para o handler central, para fechar também o drawer de projeto.

3) Manter comportamento atual dos outros fechamentos
- Fechar drawer por `X` continua como está (não muda UX lateral existente).
- Ajuste focado no clique do Dashboard, como você pediu.

Arquivos a ajustar:
- `src/components/Dashboard/DashboardLayout.tsx`
  - atualizar `handleDrawerChange` (quando `drawer === null`, fechar também `projectDrawerOpen` e limpar `selectedProjectId`)
  - atualizar `onDashboardClick` do `MobileBottomNav` para usar o reset central

Validação (rápida):
- Abrir qualquer drawer de seção -> clicar Dashboard -> fecha.
- Abrir Projetos, selecionar um projeto (abre `ProjectDrawer`) -> clicar Dashboard -> fecha tudo e mostra dashboard.
- Repetir no mobile com bottom nav.
