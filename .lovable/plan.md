

# Planejador — Gerenciador de Tarefas Premium (Bitrix24-inspired)

## Visão Geral

Criar um módulo "Planejador" integrado ao sistema existente como um novo drawer no sidebar, com Kanban board de prazos, fundo espacial, e view de detalhes da tarefa com chat integrado.

## Arquitetura

O Planejador será implementado como um drawer (padrão existente do projeto) com componentes internos próprios. Dados persistidos no Supabase com tabelas dedicadas.

## Database (Migrations)

### Tabela `planejador_tasks`
```sql
create table public.planejador_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  titulo text not null,
  descricao text,
  status text default 'pending', -- pending, in_progress, completed
  prazo timestamptz,
  proprietario_id uuid references auth.users(id),
  responsavel_id uuid references auth.users(id),
  prioridade text default 'normal',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Tabela `planejador_task_messages` (chat por tarefa)
```sql
create table public.planejador_task_messages (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.planejador_tasks(id) on delete cascade,
  user_id uuid references auth.users(id),
  content text not null,
  created_at timestamptz default now()
);
```

### Tabela `planejador_subtasks`
```sql
create table public.planejador_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.planejador_tasks(id) on delete cascade,
  titulo text not null,
  concluida boolean default false,
  created_at timestamptz default now()
);
```

RLS policies para todas as tabelas baseadas em `tenant_id`.

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/Planejador/PlanejadorDrawer.tsx` | Drawer principal com fundo espacial, top bar, abas e Kanban |
| `src/components/Planejador/PlanejadorKanban.tsx` | Board Kanban com 7 colunas coloridas por prazo + drag & drop |
| `src/components/Planejador/PlanejadorTaskCard.tsx` | Card minimalista: título, badge de prazo, avatares |
| `src/components/Planejador/PlanejadorTaskDetail.tsx` | View dividida (detalhes + chat) que abre ao clicar num card |
| `src/components/Planejador/PlanejadorTaskChat.tsx` | Painel de chat por tarefa com menções |
| `src/components/Planejador/PlanejadorCreateTask.tsx` | Dialog de criação rápida de tarefa |
| `src/components/Planejador/PlanejadorTopBar.tsx` | Top bar: logo, + Criar, filtros, pesquisa |
| `src/hooks/usePlanejadorTasks.ts` | Hook para CRUD de tasks + categorização por prazo |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `DashboardSidebar.tsx` | Adicionar item "Planejador" (icon: `LayoutGrid`) abaixo de "Projetos" no menuItems + role access |
| `DashboardSidebar.tsx` | Adicionar 'planejador' ao `ActiveDrawer` type e `drawerItems` |
| `DashboardLayout.tsx` | Importar e renderizar `PlanejadorDrawer` quando `activeDrawer === 'planejador'` |

## Design Visual

- **Fundo**: Imagem da Terra vista do espaço (CSS background com overlay escuro para legibilidade)
- **Colunas Kanban** com cores exatas do print:
  - Vencido: `#ef4444` (vermelho)
  - Vencimento hoje: `#a3e635` (verde limão)
  - Vencimento esta semana: `#22d3ee` (ciano)
  - Vencimento na próxima semana: `#60a5fa` (azul claro)
  - Sem prazo: `#9ca3af` (cinza)
  - Vencimento em duas semanas: `#3b82f6` (azul médio)
  - Concluído: `#4b5563` (cinza escuro)
- **Cards**: fundo branco com sombra sutil, tipografia limpa, badges discretos
- **Top bar**: fundo semi-transparente escuro, blur backdrop

## Fluxo de Navegação

1. Sidebar → clique "Planejador" → abre `PlanejadorDrawer` (Sheet fullscreen)
2. Kanban com drag & drop entre colunas (categorização automática por data de prazo)
3. Clique num card → abre `PlanejadorTaskDetail` (view dividida 45/55)
4. Botão "+ Criar" → dialog de criação rápida

## Escopo da Primeira Entrega

Foco na tela principal funcional:
1. Drawer com fundo espacial + top bar + Kanban colorido
2. Cards com drag & drop
3. Criação de tarefas
4. View de detalhes com chat integrado
5. Persistência no Supabase

