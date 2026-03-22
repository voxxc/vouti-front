

# Planejador: Filtro rápido "Minhas tarefas" vs "Todos"

## Situação atual

A infraestrutura já está correta:
- RLS com `tenant_id = get_user_tenant_id()` garante isolamento entre tenants
- Todos os usuários de todos os tenants já têm acesso ao Planejador
- Filtro por usuário existe no dropdown da TopBar (mostra "Todos" ou seleciona um usuário específico)

## O que falta

O filtro atual exige que o usuário abra o dropdown e se encontre na lista para ver apenas suas tarefas. Falta um **toggle rápido** entre "Minhas tarefas" e "Todos" — que é o fluxo mais comum.

## Mudanças

### 1. PlanejadorTopBar.tsx — Toggle rápido "Minhas" / "Todos"

Substituir o dropdown de usuário por um componente com duas partes:
- **Dois botões segmentados** (estilo toggle): `Minhas` | `Todos`
  - "Minhas" filtra por `user.id` (proprietário, responsável ou participante)
  - "Todos" remove o filtro de usuário
- **Dropdown adicional** (ícone de filtro ao lado): permite selecionar um usuário específico do tenant (para admins/controllers verem tarefas de um membro específico)

Quando um usuário específico é selecionado via dropdown, o toggle muda para um estado "custom" mostrando o nome do usuário.

### 2. PlanejadorDrawer.tsx — Inicializar com "Minhas tarefas"

Alterar o estado inicial de `selectedUserId` de `null` (Todos) para `user.id` (Minhas tarefas), para que cada usuário veja suas próprias tarefas ao abrir o Planejador. O toggle "Todos" permite expandir a visão.

### 3. Nenhuma mudança de banco de dados

A estrutura de tabelas, RLS e isolamento de tenant já estão corretos. Não é necessária nenhuma migration.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `PlanejadorTopBar.tsx` | Toggle segmentado "Minhas" / "Todos" + dropdown de usuário específico |
| `PlanejadorDrawer.tsx` | Estado inicial `selectedUserId = user.id` |

