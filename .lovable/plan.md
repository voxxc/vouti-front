
## Kanban com drag de colunas, persistencia do cadeado, criar colunas, coluna "Transferidos" e time do agente

### 1. Drag-and-drop de colunas no Kanban CRM

O cadeado atual so trava/destrava os **cards**. O pedido e que o cadeado controle a **movimentacao de colunas** (como no ProjectView). Para isso:

- Envolver as colunas em um `Droppable` horizontal (`type="COLUMN"`) e cada coluna em um `Draggable`
- Quando destravado (cadeado aberto), as colunas podem ser arrastadas para reordenar
- Quando travado (cadeado fechado), as colunas ficam fixas (estado padrao)
- Os cards continuam arrastáveis normalmente (independente do cadeado)
- Ao reordenar colunas, atualizar `column_order` no banco

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

### 2. Persistir estado do cadeado

Salvar o estado do cadeado no `localStorage` com chave por agente (`kanban-lock-{agentId}`). Ao carregar o Kanban, ler o valor salvo. Ao clicar no cadeado, gravar o novo valor.

**Arquivo**: `src/components/WhatsApp/sections/WhatsAppKanban.tsx`

### 3. Configuracoes > Kanban: Criar colunas

Transformar o `WhatsAppKanbanSettings.tsx` de placeholder em tela funcional:

- Listar colunas existentes de todos os agentes do tenant (agrupadas por agente)
- Formulario para criar nova coluna: nome, cor (color picker simples), e selecionar o agente
- Opcao de excluir colunas nao-padrao (colunas `is_default = true` nao podem ser excluidas)
- Reordenacao visual das colunas

**Arquivo**: `src/components/WhatsApp/settings/WhatsAppKanbanSettings.tsx`

### 4. Coluna "Transferidos" a esquerda do "Topo de Funil"

A coluna "Transferidos" nao existe no banco. Precisa ser inserida com `column_order = -1` (ou reordenar as existentes) para ficar antes do "Topo de Funil".

**Migracao SQL**:
```sql
-- Inserir coluna "Transferidos" para todos os agentes que ainda nao tem
INSERT INTO whatsapp_kanban_columns (tenant_id, agent_id, name, color, column_order, is_default)
SELECT tenant_id, id, 'Transferidos', '#a855f7', -1, true
FROM whatsapp_agents
WHERE NOT EXISTS (
  SELECT 1 FROM whatsapp_kanban_columns wkc
  WHERE wkc.agent_id = whatsapp_agents.id AND wkc.name = 'Transferidos'
);

-- Reordenar: Transferidos=0, Topo=1, 1Contato=2, etc.
UPDATE whatsapp_kanban_columns SET column_order = column_order + 1 WHERE name != 'Transferidos';
UPDATE whatsapp_kanban_columns SET column_order = 0 WHERE name = 'Transferidos';
```

Tambem atualizar a funcao `create_default_kanban_columns` para incluir "Transferidos" como primeira coluna em novos agentes.

### 5. Associar agente a um time na criacao

**Migracao SQL** - criar tabela de times e campo no agente:
```sql
CREATE TABLE whatsapp_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_agents ADD COLUMN team_id uuid REFERENCES whatsapp_teams(id);
```

Com RLS para isolamento por tenant.

**AddAgentDialog.tsx**: Adicionar campo `Select` de "Time" que carrega os times do tenant. O campo e opcional (o agente pode nao pertencer a nenhum time inicialmente).

**WhatsAppTeamsSettings.tsx**: Transformar de placeholder em tela funcional com CRUD de times (criar, listar, excluir).

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| **Migracao SQL** | Criar `whatsapp_teams`, add `team_id` em `whatsapp_agents`, inserir coluna "Transferidos", atualizar funcao `create_default_kanban_columns` |
| `WhatsAppKanban.tsx` | Drag de colunas (Droppable horizontal), persistir cadeado em localStorage |
| `WhatsAppKanbanSettings.tsx` | CRUD de colunas Kanban (criar, listar, excluir) |
| `AddAgentDialog.tsx` | Campo Select de time ao criar agente |
| `WhatsAppTeamsSettings.tsx` | CRUD de times |
