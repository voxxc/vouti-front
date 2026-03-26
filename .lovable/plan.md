

# Nova aba "Prazos" no Planejador

## O que será feito

Adicionar uma aba **"Prazos"** ao lado das abas existentes (Colunas, Lista, Calendário) no Planejador. Essa aba exibirá os prazos da tabela `deadlines` associados ao usuário atual (como advogado responsável ou usuário marcado) em um layout Kanban com colunas por vencimento — reutilizando a mesma lógica visual das colunas do Planejador (Vencido, Hoje, Esta Semana, etc.).

Ao clicar em um card de prazo, abrirá o `DeadlineDetailDialog` já existente.

## Alterações

### 1. Novo componente `PlanejadorPrazosView.tsx`
- Busca prazos do `useAgendaData` (ou query própria filtrada pelo usuário)
- Categoriza prazos nas mesmas colunas temporais (vencido, hoje, esta_semana, proxima_semana, sem_prazo, concluído)
- Renderiza colunas estilizadas com o visual glass do Planejador (mesma estética do Kanban existente)
- Cards compactos mostrando: título, projeto, data, advogado responsável
- Ao clicar: abre `DeadlineDetailDialog` com o `deadlineId`

### 2. Atualizar `PlanejadorTopBar.tsx`
- Adicionar `{ id: 'prazos', label: 'Prazos' }` ao array `TABS`

### 3. Atualizar `PlanejadorDrawer.tsx`
- Importar `PlanejadorPrazosView` e `DeadlineDetailDialog`
- Renderizar a view quando `activeTab === 'prazos'`
- Gerenciar state para `deadlineDetailId` e abertura do dialog

## Arquivos

- **Novo**: `src/components/Planejador/PlanejadorPrazosView.tsx`
- **Modificar**: `src/components/Planejador/PlanejadorTopBar.tsx` (adicionar tab)
- **Modificar**: `src/components/Planejador/PlanejadorDrawer.tsx` (renderizar view + dialog)

