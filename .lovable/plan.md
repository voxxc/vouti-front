
## Plano: Kanban por Papel + Sistema Completo de Etiquetas

### Resumo

Três funcionalidades estruturais:

1. **Kanban com visibilidade por papel** - Atendentes veem só o próprio Kanban; Admins veem todos
2. **Botão "Adicionar Etiqueta"** funcional - Dropdown para associar etiquetas a contatos
3. **Tela de Configurações > Etiquetas** - CRUD completo de etiquetas com cores

---

### 1. Controle de Visibilidade do Kanban

**Problema atual:**
A sidebar (`WhatsAppSidebar.tsx`) lista TODOS os agentes ativos. Colaboradores (atendentes) deveriam ver apenas seu próprio Kanban.

**Solução:**

| Papel | Comportamento |
|-------|---------------|
| **Admin / Controller** | Vê dropdown com todos os agentes |
| **Atendente (agente)** | Vê apenas seu agente no menu (detectado via `agentId` do AccessGate) |

**Arquivos a modificar:**

| Arquivo | Alteração |
|---------|-----------|
| `WhatsAppAccessGate.tsx` | Já retorna `agentId` - OK |
| `WhatsAppLayout.tsx` | Receber `agentId` via contexto ou prop drilling e passar para sidebar |
| `WhatsAppSidebar.tsx` | Filtrar lista de agentes baseado no papel do usuário |

**Lógica:**

```tsx
// WhatsAppSidebar.tsx - dentro de loadAgents()
if (tenantId) {
  // Verificar se usuário é admin/controller
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "controller"])
    .maybeSingle();
    
  if (roleData) {
    // Admin/Controller: carregar todos os agentes
    query = query.eq("tenant_id", tenantId);
  } else {
    // Atendente: carregar apenas seu próprio agente
    query = query.eq("tenant_id", tenantId).eq("user_id", userId);
  }
}
```

---

### 2. Botão "Adicionar Etiqueta" Funcional

**Problema atual:**
O botão em `ContactInfoPanel.tsx` não faz nada.

**Solução:**
Criar dropdown com etiquetas existentes + opção de criar nova.

**Componente novo:** `AddLabelDropdown.tsx`

```tsx
interface AddLabelDropdownProps {
  contactId: string;
  contactPhone: string;
  currentLabels: string[];
  onLabelsChange: () => void;
}
```

**Funcionalidade:**
- Lista todas as etiquetas disponíveis
- Checkbox para cada uma (toggle)
- Botão "Criar nova etiqueta" inline
- Ao clicar, insere/remove em `whatsapp_contact_labels`

**Arquivos a criar/modificar:**

| Arquivo | Alteração |
|---------|-----------|
| `src/components/WhatsApp/components/AddLabelDropdown.tsx` | **Criar** - Dropdown com lista de etiquetas |
| `ContactInfoPanel.tsx` | Substituir botão estático por `AddLabelDropdown` |

---

### 3. Tela de Configurações > Etiquetas (CRUD)

**Problema atual:**
`WhatsAppLabelsSettings.tsx` mostra apenas "Em desenvolvimento..."

**Solução:**
Implementar CRUD completo:

- **Listar** etiquetas com nome e cor
- **Criar** nova etiqueta (nome + cor picker)
- **Editar** etiqueta inline (nome + cor)
- **Excluir** etiqueta com confirmação

**Arquivos a modificar:**

| Arquivo | Alteração |
|---------|-----------|
| `WhatsAppLabelsSettings.tsx` | Implementar listagem, criação, edição e exclusão |

**Componentes internos:**

```tsx
// Dentro de WhatsAppLabelsSettings
- LabelRow: exibe etiqueta com ações (edit/delete)
- CreateLabelForm: input nome + color picker
- EditLabelDialog: modal de edição
```

**Interface visual:**
```
┌──────────────────────────────────────────────┐
│ Etiquetas                                     │
│ Organize suas conversas com etiquetas         │
├──────────────────────────────────────────────┤
│ + Criar Etiqueta  [Nome...] [🎨] [Salvar]    │
├──────────────────────────────────────────────┤
│ ● Lead Quente        [✏️] [🗑️]              │
│ ● Suporte            [✏️] [🗑️]              │
│ ● Fechado            [✏️] [🗑️]              │
└──────────────────────────────────────────────┘
```

**Cores pré-definidas:**
```tsx
const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];
```

---

### 4. Integração com Filtro de Contatos

**Status atual:**
A seção `WhatsAppContacts.tsx` já tem um Select para filtrar por etiqueta - isso funcionará automaticamente após a criação de etiquetas.

---

### Arquivos a Modificar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `WhatsAppLayout.tsx` | Modificar | Propagar contexto do usuário para sidebar |
| `WhatsAppSidebar.tsx` | Modificar | Filtrar agentes baseado no papel |
| `WhatsAppLabelsSettings.tsx` | Modificar | CRUD completo de etiquetas |
| `ContactInfoPanel.tsx` | Modificar | Integrar dropdown de etiquetas |
| `AddLabelDropdown.tsx` | **Criar** | Dropdown para adicionar etiquetas |

---

### Fluxo Final

```text
┌─────────────────────────────────────────────────────────────┐
│                     KANBAN                                   │
├─────────────────────────────────────────────────────────────┤
│ [Atendente] → Clica Kanban → Vê só seu pipeline             │
│ [Admin]     → Clica Kanban → Dropdown com todos os agentes  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ETIQUETAS                                   │
├─────────────────────────────────────────────────────────────┤
│ Caixa de Entrada → Abre conversa → "Adicionar Etiqueta"     │
│                  → Dropdown aparece com etiquetas           │
│                  → Seleciona/cria → Vincula ao contato      │
├─────────────────────────────────────────────────────────────┤
│ Configurações → Etiquetas → CRUD de etiquetas               │
│ Contatos → Filtro por etiqueta funciona automaticamente     │
└─────────────────────────────────────────────────────────────┘
```

---

### Detalhes Técnicos

**Tabelas utilizadas:**
- `whatsapp_labels` (id, tenant_id, name, color)
- `whatsapp_contact_labels` (id, contact_id, label_id)

**RLS:**
As tabelas já possuem políticas baseadas em `tenant_id` - nenhuma migração necessária.

**Contexto de isolamento:**
- Tenants: filtram por `tenant_id`
- Super Admin: filtra por `tenant_id IS NULL`
