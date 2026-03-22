

# Planejador: Notificações de Chat, Aba Info, Etapas, Cards de Subtarefas e Registros de Auditoria

## Resumo

7 mudanças principais para tornar o Planejador completo: notificações do chat, aba Info, etapas de tarefa, subtarefas como cards no Kanban, e registro de atividades (audit log).

---

## 1. Banco de Dados — Migration

### 1.1 Novo tipo de notificação `planejador_chat_message`
Atualizar a constraint `notifications_type_check` para incluir o novo tipo.

### 1.2 Tabela `planejador_task_etapas`
Etapas da tarefa (ex: "Análise", "Execução", "Revisão"):

```sql
CREATE TABLE public.planejador_task_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  concluida BOOLEAN DEFAULT FALSE,
  tenant_id UUID REFERENCES public.tenants(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.planejador_task_etapas ENABLE ROW LEVEL SECURITY;
-- RLS: tenant isolation
CREATE POLICY "tenant_isolation" ON public.planejador_task_etapas
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
```

### 1.3 Tabela `planejador_task_activity_log`
Registro de todas as ações (criação, status, subtarefa criada/concluída, etc.):

```sql
CREATE TABLE public.planejador_task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.planejador_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'created', 'status_changed', 'subtask_created', etc.
  details JSONB DEFAULT '{}',
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.planejador_task_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.planejador_task_activity_log
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());
```

---

## 2. Notificações de Chat do Planejador

### 2.1 `PlanejadorTaskChat.tsx`
Ao enviar mensagem no chat, inserir notificação na tabela `notifications` para todos os participantes da tarefa (+ proprietário), exceto o remetente:
- `type`: `'planejador_chat_message'`
- `title`: `'Nova mensagem no Planejador'`
- `content`: `'{nome} enviou: "{trecho da mensagem}"'`
- `related_task_id`: ID da tarefa

### 2.2 `NotificationCenter.tsx`
- Adicionar ícone para `planejador_chat_message` (💬 com contexto "Planejador")
- No `handleNotificationClick`: ao clicar, chamar novo callback `onPlanejadorTaskNavigation(taskId)`

### 2.3 `DashboardLayout.tsx`
- Passar novo prop `onPlanejadorTaskNavigation` ao NotificationCenter
- Ao receber o callback: abrir PlanejadorDrawer e selecionar a tarefa correspondente

### 2.4 `useNotifications.ts`
- Adicionar `'planejador_chat_message'` ao tipo `Notification['type']`

---

## 3. Aba INFO dentro da Tarefa

### `PlanejadorTaskDetail.tsx`
Reestruturar o layout do painel esquerdo com **2 abas**: `Detalhes` (conteúdo atual) e `Info`.

**Aba Info** exibe um resumo consolidado:
- **Informações gerais**: Título, status, prioridade, criado em, atualizado em
- **Cliente vinculado**: Nome, CPF/CNPJ (se houver)
- **Processo vinculado**: CNJ, partes, tribunal (se houver)
- **Subtarefas**: Lista com status, indicando "vinculada à tarefa X"
- **Participantes**: Lista de nomes
- **Etapas**: Progresso visual
- **Registro de atividades**: Timeline cronológica de todas as ações

---

## 4. Etapas da Tarefa

### 4.1 Hook `usePlanejadorEtapas.ts` (novo)
CRUD para `planejador_task_etapas`: create, toggle, reorder, remove.

### 4.2 `PlanejadorTaskDetail.tsx`
Novo item expandível no sidebar: **Etapas** (ícone `Milestone`):
- Adicionar etapa com nome
- Marcar como concluída
- Barra de progresso visual (X de Y concluídas)
- Drag para reordenar

---

## 5. Subtarefas como Cards no Kanban

### 5.1 `PlanejadorTaskCard.tsx`
Quando uma subtarefa é criada, exibir um indicador visual no card (ex: `2/5 subtarefas`).

### 5.2 Aba Info — Subtarefas
Cada subtarefa mostrará: "Vinculada à tarefa: {título da tarefa pai}".

---

## 6. Registro de Atividades (Audit Log)

### 6.1 Hook `usePlanejadorActivityLog.ts` (novo)
- Query: buscar logs por `task_id`
- Mutation: inserir log ao criar tarefa, mudar status, criar/concluir subtarefa, vincular cliente/processo, adicionar participante, etc.

### 6.2 Integração nos hooks existentes
Nos `onSuccess` de `usePlanejadorTasks`, `usePlanejadorSubtasks`, e nos handlers de `PlanejadorTaskDetail`, inserir registros de atividade.

### 6.3 Exibição na aba Info
Timeline vertical com ícones, ação, autor e timestamp.

---

## Arquivos modificados/criados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | 2 tabelas novas + constraint atualizada |
| `src/hooks/usePlanejadorEtapas.ts` | Novo hook CRUD etapas |
| `src/hooks/usePlanejadorActivityLog.ts` | Novo hook audit log |
| `src/hooks/usePlanejadorSubtasks.ts` | Adicionar log de atividade |
| `src/hooks/usePlanejadorTasks.ts` | Adicionar log de atividade |
| `src/hooks/useNotifications.ts` | Novo tipo `planejador_chat_message` |
| `src/components/Planejador/PlanejadorTaskDetail.tsx` | Aba Info, Etapas, atividades |
| `src/components/Planejador/PlanejadorTaskChat.tsx` | Notificar participantes |
| `src/components/Planejador/PlanejadorTaskCard.tsx` | Indicador subtarefas |
| `src/components/Communication/NotificationCenter.tsx` | Tipo + navegação planejador |
| `src/components/Dashboard/DashboardLayout.tsx` | Callback planejador |
| `src/utils/notificationHelpers.ts` | Helper para notificação planejador |

