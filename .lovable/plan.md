
## Objetivo

Adicionar um menu de 3 pontinhos (`MoreVertical`) em cada linha da lista de processos (`ProjectProtocolosList`) com duas funcionalidades:

1. **Adicionar Marcador...** — abre submenu listando marcadores já criados do projeto, permite criar novos (com nome + cor) e atribuir/remover. Marcadores atribuídos aparecem como **Badge** colorido na linha do processo (ao lado do status "Em Andamento").
2. **Trocar de Workspace** — submenu listando as outras abas (workspaces) do projeto; ao escolher, o processo é movido para aquele workspace.

## Causa raiz / contexto

Hoje a linha do processo só tem o ícone `FolderInput` (Mover para carteira) + Badge de status. Não existe um menu unificado de ações por processo, nem conceito de "marcadores" (existe `project_carteiras`, que é agrupamento visual, não etiqueta).

## Correção

### 1. Banco de dados (nova migration)

Duas tabelas novas, escopadas por projeto (multi-tenant via `tenant_id`):

```sql
-- Definição dos marcadores (por projeto)
create table public.project_protocolo_marcadores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  tenant_id uuid not null,
  nome text not null,
  cor text not null default '#6366f1',
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.project_protocolo_marcadores to authenticated;
grant all on public.project_protocolo_marcadores to service_role;
alter table public.project_protocolo_marcadores enable row level security;
-- Policies: SELECT/INSERT/UPDATE/DELETE para usuários do mesmo tenant
--   usando has_role_in_tenant() (padrão do projeto)

-- Atribuição de marcadores a protocolos
create table public.project_protocolo_marcador_assignments (
  id uuid primary key default gen_random_uuid(),
  protocolo_id uuid not null references public.project_protocolos(id) on delete cascade,
  marcador_id uuid not null references public.project_protocolo_marcadores(id) on delete cascade,
  tenant_id uuid not null,
  created_at timestamptz not null default now(),
  unique (protocolo_id, marcador_id)
);
grant select, insert, delete on public.project_protocolo_marcador_assignments to authenticated;
grant all on public.project_protocolo_marcador_assignments to service_role;
alter table public.project_protocolo_marcador_assignments enable row level security;
-- Policies: idem (mesmo tenant)
create index on public.project_protocolo_marcador_assignments(protocolo_id);
create index on public.project_protocolo_marcador_assignments(marcador_id);
```

### 2. Hook novo: `useProjectProtocoloMarcadores(projectId)`

- `marcadores`, `assignments` (map `protocoloId → marcadorId[]`)
- `createMarcador({ nome, cor })`
- `updateMarcador(id, { nome, cor })`
- `deleteMarcador(id)`
- `assignMarcador(protocoloId, marcadorId)`
- `unassignMarcador(protocoloId, marcadorId)`
- Usa `fetchAllPaginated` para listagens (padrão do projeto).

### 3. UI: alterar `ProjectProtocolosList.tsx`

Em `renderProtocoloItem`, substituir o botão `FolderInput` por **um único `DropdownMenu` com ícone `MoreVertical`** contendo:

```
[•••]
├─ Marcadores
│   ├─ (lista de marcadores com checkbox + bolinha de cor)
│   ├─ ─────────
│   └─ + Criar novo marcador...   → abre Dialog
├─ Mover para carteira          (mantém comportamento atual, só vira item)
│   └─ submenu de carteiras
├─ Trocar de Workspace
│   └─ submenu de workspaces (oculta o atual)
└─ ─────────
   [demais ações futuras]
```

Renderizar os **badges de marcadores atribuídos** na linha do processo, entre o nome e o badge de status (ou logo abaixo do `etapas concluídas`), usando `<Badge>` com `style={{ backgroundColor: cor, color: '#fff' }}`.

### 4. Dialog "Criar/Editar Marcador"

Reaproveitar padrão do dialog de Carteira já existente: input de nome + input `type="color"` + botões Salvar/Cancelar. Permite também excluir marcador (com confirmação) e editar pelo mesmo dialog.

### 5. Trocar de Workspace

`ProjectProtocolosList` já recebe `workspaceId`. Precisamos receber também a lista de `workspaces` (vinda de `useProjectWorkspaces` no componente pai `ProjectDrawerContent` ou similar) e uma função `onMoveToWorkspace(protocoloId, targetWorkspaceId)`. Implementação: `update project_protocolos set workspace_id = $1 where id = $2`. Após sucesso: `refetch()` da lista (o processo some da aba atual) + toast.

## Arquivos afetados

- `supabase/migrations/<timestamp>_marcadores_protocolo.sql` — nova migration
- `src/hooks/useProjectProtocoloMarcadores.ts` — novo hook
- `src/components/Project/ProjectProtocolosList.tsx` — menu 3 pontinhos + badges de marcadores + receber `workspaces` e handler de troca
- `src/components/Project/MarcadorDialog.tsx` — novo (criar/editar marcador)
- Componente pai que renderiza `ProjectProtocolosList` (`ProjectDrawerContent.tsx` ou `ProjectProtocoloDrawer.tsx`) — passar `workspaces` + `onMoveToWorkspace` por props
- `src/integrations/supabase/types.ts` — regenerado automaticamente pela migration

## Impacto

**1. Usuário final (UX/telas/fluxos)**
- Cada linha de processo ganha um botão `•••` no canto direito (aparece sempre, não só com carteiras).
- Pode criar marcadores ilimitados por projeto, com cor customizada — eles viram badges visíveis na linha (ex: 🟣 "Urgente", 🟢 "Aguardando cliente").
- Mover processo entre abas (workspaces) deixa de exigir recriar/copiar: 1 clique no menu e o processo sai da aba atual e aparece na aba destino.
- O botão atual `FolderInput` (Mover para carteira) é absorvido pelo menu, reduzindo poluição visual da linha.

**2. Dados (migrations/RLS/performance)**
- Duas tabelas novas com RLS por tenant via `has_role_in_tenant()` — isolamento garantido.
- Índices em `protocolo_id` e `marcador_id` para join rápido na renderização da lista.
- `update workspace_id` em `project_protocolos` é uma única linha — sem impacto de performance. Já existe índice em `(project_id, workspace_id)` implicitamente usado pela query do hook.

**3. Riscos colaterais**
- Mover processo entre workspaces pode confundir se o usuário não notar que o item "sumiu" da aba atual → mitigado com toast "Processo movido para a aba X".
- Marcadores são **por projeto**, não globais do tenant — se o usuário esperar reaproveitar marcadores entre projetos, vai precisar recriar. (Decisão consciente; é o mesmo padrão de `project_carteiras`.)
- Carteiras (já existentes) continuam funcionando normalmente; marcadores são uma camada paralela.

**4. Quem é afetado**
- Todos os usuários com acesso a projetos (todos os roles que já enxergam `ProjectProtocolosList`).
- Sem mudança para admin/financeiro/comercial específica — é melhoria de UX geral.
- Multi-tenant: cada tenant cria seus próprios marcadores; nada vaza entre tenants (RLS).

## Validação

1. Criar 2 marcadores ("Urgente" vermelho, "Aguardando" amarelo) → aparecem no submenu.
2. Atribuir ambos a um processo → 2 badges coloridos renderizam na linha.
3. Desmarcar um → badge some imediatamente.
4. Excluir marcador "Urgente" → todas as atribuições caem em cascata (FK `on delete cascade`).
5. Trocar processo de "Aba Principal" para "Aba 2" → processo some da Principal, aparece na Aba 2 após selecionar.
6. Tentar acessar marcadores de outro tenant via SQL direto → bloqueado pelo RLS.
7. Verificar que o menu não quebra layout em viewport mobile (testar < 640px).
