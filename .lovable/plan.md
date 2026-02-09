

## Plano: Reestruturação Completa do Vouti.Bot - Conversas, Contatos, Kanban por Agente

### Resumo Executivo

Implementar uma reestruturação significativa do Vouti.Bot com:

1. **Botão "Conversas" com dropdown** contendo "Todas as Conversas"
2. **"Todas as Conversas"** agrupa mensagens de TODOS os agentes, exibindo badge com nome do agente
3. **"Caixa de Entrada"** mostra apenas conversas do agente/usuário logado
4. **Salvar Contato** via ícone de canetinha no painel direito
5. **Lista de Contatos** com filtro por etiquetas
6. **Kanban CRM com dropdown** para navegar entre Kanbans de cada agente

---

### Arquitetura das Mudanças

```text
VOUTI.BOT SIDEBAR (Atualizada)
        │
        ├── Caixa de Entrada (conversas do usuário logado)
        │
        ├── Conversas (DROPDOWN) ─────┐
        │       └── Todas as Conversas │ → Agrega de TODOS os agentes
        │                              │   com badge do agente
        │
        ├── Kanban CRM (DROPDOWN) ────┐
        │       ├── Agente Daniel     │ → Kanban específico do Daniel
        │       ├── Agente Maria      │ → Kanban específico da Maria
        │       └── Agente João       │ → Kanban específico do João
        │
        ├── Contatos ─────────────────→ Lista salva + filtro por etiquetas
        │
        └── Configurações (dropdown existente)
```

---

### Novas Tabelas no Banco de Dados

#### 1. Tabela `whatsapp_contacts` - Contatos Salvos

```sql
CREATE TABLE public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone)
);
```

#### 2. Tabela `whatsapp_labels` - Etiquetas

```sql
CREATE TABLE public.whatsapp_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name)
);
```

#### 3. Tabela `whatsapp_contact_labels` - Vínculo Contato/Etiqueta

```sql
CREATE TABLE public.whatsapp_contact_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES whatsapp_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, label_id)
);
```

#### 4. Tabela `whatsapp_kanban_columns` - Colunas do Kanban (por Agente)

```sql
CREATE TABLE public.whatsapp_kanban_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  column_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Colunas padrão serão criadas para cada agente:
-- "Novo Lead", "Em Contato", "Negociando", "Fechado", "Perdido"
```

#### 5. Tabela `whatsapp_conversation_kanban` - Posição no Kanban

```sql
CREATE TABLE public.whatsapp_conversation_kanban (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  column_id UUID REFERENCES whatsapp_kanban_columns(id) ON DELETE SET NULL,
  card_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, agent_id, phone)
);
```

#### 6. Atualizar `whatsapp_messages` - Adicionar agent_id

```sql
ALTER TABLE public.whatsapp_messages
ADD COLUMN agent_id UUID REFERENCES whatsapp_agents(id) ON DELETE SET NULL;

CREATE INDEX idx_whatsapp_messages_agent 
ON whatsapp_messages(agent_id) WHERE agent_id IS NOT NULL;
```

---

### Componentes a Criar/Modificar

| Componente | Ação |
|------------|------|
| `WhatsAppSidebar.tsx` | Adicionar dropdown em "Conversas" e "Kanban CRM" |
| `WhatsAppDrawer.tsx` | Adicionar novas sections + estado de agente selecionado |
| `WhatsAppLayout.tsx` | Mesmas alterações (rota /bot usa Layout, não Drawer) |
| `WhatsAppAllConversations.tsx` | **NOVO** - Todas conversas com badge do agente |
| `WhatsAppInbox.tsx` | Filtrar por agente do usuário logado |
| `ContactInfoPanel.tsx` | Adicionar botão salvar contato (canetinha) |
| `SaveContactDialog.tsx` | **NOVO** - Dialog para salvar contato |
| `WhatsAppContacts.tsx` | Implementar lista com filtro por etiquetas |
| `WhatsAppKanban.tsx` | Receber prop `agentId` e exibir Kanban específico |

---

### Etapa 1: Sidebar com Dropdowns

Modificar `WhatsAppSidebar.tsx` para ter dropdowns em "Conversas" e "Kanban CRM":

```tsx
// Estado para controlar os dropdowns
const [conversationsOpen, setConversationsOpen] = useState(false);
const [kanbanOpen, setKanbanOpen] = useState(false);
const [agents, setAgents] = useState([]);

// Carregar lista de agentes para o dropdown do Kanban
useEffect(() => {
  loadAgents();
}, [tenantId]);

const loadAgents = async () => {
  const { data } = await supabase
    .from("whatsapp_agents")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  setAgents(data || []);
};

// No render - Conversas com dropdown
<Collapsible open={conversationsOpen} onOpenChange={setConversationsOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      <span className="flex items-center gap-3">
        <MessageSquare className="h-4 w-4" />
        <span>Conversas</span>
      </span>
      {conversationsOpen ? <ChevronDown /> : <ChevronRight />}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="pl-4">
    <Button 
      variant="ghost" 
      className="w-full justify-start"
      onClick={() => onSectionChange("all-conversations")}
    >
      Todas as Conversas
    </Button>
  </CollapsibleContent>
</Collapsible>

// Kanban CRM com dropdown de agentes
<Collapsible open={kanbanOpen} onOpenChange={setKanbanOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      <span className="flex items-center gap-3">
        <Columns3 className="h-4 w-4" />
        <span>Kanban CRM</span>
      </span>
      {kanbanOpen ? <ChevronDown /> : <ChevronRight />}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="pl-4">
    {agents.map((agent) => (
      <Button 
        key={agent.id}
        variant="ghost" 
        className="w-full justify-start"
        onClick={() => onKanbanAgentSelect(agent.id)}
      >
        {agent.name}
      </Button>
    ))}
  </CollapsibleContent>
</Collapsible>
```

---

### Etapa 2: "Todas as Conversas" com Badge do Agente

Criar `WhatsAppAllConversations.tsx`:

```tsx
// Estrutura expandida com agente
interface AllConversationsItem extends WhatsAppConversation {
  agentId?: string;
  agentName?: string;
}

// Buscar TODAS as mensagens de TODOS os agentes do tenant
const loadAllConversations = async () => {
  const { data } = await supabase
    .from("whatsapp_messages")
    .select(`
      *,
      whatsapp_agents!agent_id(id, name)
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  // Agrupar por número + agente
  const conversationMap = new Map();
  data?.forEach((msg) => {
    const key = `${msg.from_number}-${msg.agent_id}`;
    if (!conversationMap.has(key)) {
      conversationMap.set(key, {
        id: msg.id,
        contactNumber: msg.from_number,
        agentName: msg.whatsapp_agents?.name || "Sem agente",
        lastMessage: msg.message_text,
        lastMessageTime: msg.created_at
      });
    }
  });
  
  return Array.from(conversationMap.values());
};

// Na lista - exibir badge com nome do agente
<div className="flex items-center gap-2">
  <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
    {conversation.agentName}
  </Badge>
  <span className="font-medium">{conversation.contactName}</span>
</div>
```

---

### Etapa 3: Caixa de Entrada Filtrada

Modificar `WhatsAppInbox.tsx` para filtrar pelo agente do usuário logado:

```tsx
// Detectar se usuário é agente cadastrado
const { data: userAgent } = await supabase
  .from("whatsapp_agents")
  .select("id")
  .eq("email", user?.email)
  .eq("tenant_id", tenantId)
  .maybeSingle();

// Se for agente específico, filtrar
let query = supabase
  .from("whatsapp_messages")
  .select("*")
  .eq("tenant_id", tenantId);

if (userAgent?.id) {
  // Agente vê apenas suas conversas
  query = query.eq("agent_id", userAgent.id);
}
// Se for admin, vê tudo (sem filtro adicional)
```

---

### Etapa 4: Salvar Contato (Canetinha)

Modificar `ContactInfoPanel.tsx`:

```tsx
import { Pencil } from "lucide-react";
import { SaveContactDialog } from "./SaveContactDialog";

// No header do avatar
<div className="relative">
  <Avatar className="h-20 w-20 mx-auto mb-4">
    <AvatarFallback>{conversation.contactName.charAt(0)}</AvatarFallback>
  </Avatar>
  
  {/* Botão de salvar contato */}
  <Button 
    variant="ghost" 
    size="icon"
    className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-background shadow-md hover:bg-accent"
    onClick={() => setShowSaveDialog(true)}
    title="Salvar contato"
  >
    <Pencil className="h-3.5 w-3.5" />
  </Button>
</div>

<SaveContactDialog 
  open={showSaveDialog}
  onOpenChange={setShowSaveDialog}
  phone={conversation.contactNumber}
  initialName={conversation.contactName}
/>
```

Criar `SaveContactDialog.tsx`:

```tsx
export const SaveContactDialog = ({ open, onOpenChange, phone, initialName }) => {
  const [name, setName] = useState(initialName || "");
  const [email, setEmail] = useState("");
  const { tenantId } = useTenantId();

  const handleSave = async () => {
    await supabase
      .from("whatsapp_contacts")
      .upsert({
        tenant_id: tenantId,
        phone,
        name: name.trim(),
        email: email.trim() || null,
      }, { onConflict: 'tenant_id,phone' });
    
    toast.success("Contato salvo!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Salvar Contato
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Telefone</Label>
            <Input value={phone} disabled />
          </div>
          <div>
            <Label>Nome *</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Nome do contato"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="email@exemplo.com"
              type="email"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

### Etapa 5: Lista de Contatos com Filtro por Etiquetas

Implementar `WhatsAppContacts.tsx`:

```tsx
export const WhatsAppContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [labels, setLabels] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadContacts = async () => {
    let query = supabase
      .from("whatsapp_contacts")
      .select(`
        *,
        whatsapp_contact_labels(
          whatsapp_labels(id, name, color)
        )
      `)
      .eq("tenant_id", tenantId)
      .order("name");

    const { data } = await query;
    setContacts(data || []);
  };

  // Filtrar por busca e etiqueta
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contact.phone.includes(searchQuery);
    
    if (selectedLabel) {
      const hasLabel = contact.whatsapp_contact_labels?.some(
        cl => cl.whatsapp_labels?.id === selectedLabel
      );
      return matchesSearch && hasLabel;
    }
    
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col p-6">
      <h2 className="text-xl font-semibold mb-4">Contatos</h2>
      
      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <Input 
          placeholder="Buscar contato..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedLabel} onValueChange={setSelectedLabel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todas</SelectItem>
            {labels.map(label => (
              <SelectItem key={label.id} value={label.id}>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de contatos */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {filteredContacts.map(contact => (
            <Card key={contact.id} className="p-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                </div>
                <div className="flex gap-1">
                  {contact.whatsapp_contact_labels?.map(cl => (
                    <Badge 
                      key={cl.whatsapp_labels.id}
                      style={{ backgroundColor: cl.whatsapp_labels.color }}
                      className="text-white text-xs"
                    >
                      {cl.whatsapp_labels.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
```

---

### Etapa 6: Kanban CRM por Agente

Implementar `WhatsAppKanban.tsx` com prop `agentId`:

```tsx
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface WhatsAppKanbanProps {
  agentId: string;
  agentName: string;
}

export const WhatsAppKanban = ({ agentId, agentName }: WhatsAppKanbanProps) => {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    loadKanbanData();
  }, [agentId]);

  const loadKanbanData = async () => {
    // Carregar colunas do agente
    const { data: columnsData } = await supabase
      .from("whatsapp_kanban_columns")
      .select("*")
      .eq("agent_id", agentId)
      .order("column_order");

    // Se não existirem colunas, criar padrão
    if (!columnsData?.length) {
      await createDefaultColumns(agentId);
      return loadKanbanData();
    }

    // Carregar cards (conversas posicionadas)
    const { data: cardsData } = await supabase
      .from("whatsapp_conversation_kanban")
      .select("*")
      .eq("agent_id", agentId);

    setColumns(columnsData);
    setCards(cardsData || []);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    
    await supabase
      .from("whatsapp_conversation_kanban")
      .upsert({
        tenant_id: tenantId,
        agent_id: agentId,
        phone: draggableId,
        column_id: destination.droppableId,
        card_order: destination.index
      }, { onConflict: 'tenant_id,agent_id,phone' });

    loadKanbanData();
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Kanban CRM</h2>
          <p className="text-sm text-muted-foreground">
            Pipeline do agente: <span className="font-medium">{agentName}</span>
          </p>
        </div>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div 
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "w-72 min-w-72 bg-muted/50 rounded-lg p-4 flex flex-col",
                    snapshot.isDraggingOver && "bg-primary/5"
                  )}
                >
                  {/* Header da coluna */}
                  <div className="flex items-center gap-2 mb-4">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="font-semibold text-sm">{column.name}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {getCardsInColumn(column.id).length}
                    </Badge>
                  </div>
                  
                  {/* Cards */}
                  <div className="flex-1 space-y-2">
                    {getCardsInColumn(column.id).map((card, index) => (
                      <Draggable key={card.phone} draggableId={card.phone} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-3 cursor-grab active:cursor-grabbing"
                          >
                            <p className="font-medium text-sm">{card.contactName}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {card.phone}
                            </p>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};
```

---

### Fluxo Visual Final

```text
┌─────────────────────────────────────────────────────────────────────┐
│  VOUTI.BOT                                                          │
├─────────────────┬───────────────────────────────────────────────────┤
│ ← Voltar        │                                                   │
│ [Logo] Vouti.Bot│           KANBAN CRM - Agente Daniel              │
│                 │                                                   │
│ ■ Caixa Entrada │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│                 │  │ Novo    │ │Em       │ │Negoci-  │ │ Fechado │  │
│ ▼ Conversas     │  │ Lead    │ │Contato  │ │ando     │ │         │  │
│   • Todas       │  │ ────────│ │─────────│ │─────────│ │─────────│  │
│                 │  │ ┌─────┐ │ │ ┌─────┐ │ │         │ │ ┌─────┐ │  │
│ ▼ Kanban CRM    │  │ │João │ │ │ │Maria│ │ │         │ │ │Pedro│ │  │
│   • Daniel      │  │ │Silva│ │ │ │Costa│ │ │         │ │ │Lima │ │  │
│   • Maria       │  │ └─────┘ │ │ └─────┘ │ │         │ │ └─────┘ │  │
│   • João        │  │ ┌─────┐ │ │         │ │         │ │         │  │
│                 │  │ │Ana  │ │ │         │ │         │ │         │  │
│ ■ Contatos      │  │ │Souza│ │ │         │ │         │ │         │  │
│                 │  │ └─────┘ │ │         │ │         │ │         │  │
│ ■ Relatórios    │  └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│                 │                                                   │
│ ▼ Configurações │                                                   │
│   • Agentes     │                                                   │
│   • Etiquetas   │                                                   │
├─────────────────┴───────────────────────────────────────────────────┤
│ 👤 daniel@email.com • Online                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| **Nova migração SQL** | Criar tabelas: contacts, labels, contact_labels, kanban_columns, conversation_kanban |
| **WhatsAppSidebar.tsx** | Adicionar dropdown em "Conversas" e "Kanban CRM" com lista de agentes |
| **WhatsAppDrawer.tsx** | Adicionar section `all-conversations` + estado de `selectedKanbanAgent` |
| **WhatsAppLayout.tsx** | Mesmas alterações para a rota /bot |
| **WhatsAppAllConversations.tsx** | **NOVO** - Todas conversas com badge do agente |
| **WhatsAppInbox.tsx** | Filtrar por agente do usuário logado |
| **ContactInfoPanel.tsx** | Adicionar botão salvar contato (canetinha) |
| **SaveContactDialog.tsx** | **NOVO** - Dialog para salvar contato |
| **WhatsAppContacts.tsx** | Implementar lista real com filtro por etiquetas |
| **WhatsAppKanban.tsx** | Implementar board com drag-and-drop, recebendo `agentId` |

---

### Ordem de Implementação

1. **Migração SQL** - Criar todas as tabelas necessárias + adicionar agent_id em whatsapp_messages
2. **Sidebar** - Adicionar dropdowns em Conversas e Kanban CRM
3. **Drawer/Layout** - Gerenciar estado de agente selecionado para Kanban
4. **Todas Conversas** - Componente com badge de agente
5. **Caixa de Entrada** - Filtrar por agente logado
6. **Salvar Contato** - Botão canetinha e dialog
7. **Lista de Contatos** - Com filtro por etiquetas
8. **Kanban CRM** - Board com drag-and-drop por agente

---

### Benefícios

| Aspecto | Melhoria |
|---------|----------|
| **Visibilidade Total** | Admin vê TODAS conversas de TODOS agentes em um lugar |
| **Organização por Agente** | Badge identifica qual agente cuida de cada conversa |
| **Kanban Personalizado** | Cada agente tem seu próprio pipeline de leads |
| **Navegação Rápida** | Dropdown permite alternar entre Kanbans dos agentes |
| **Gestão de Contatos** | Salvar e organizar contatos com etiquetas |
| **Privacidade** | Agentes veem apenas suas conversas na Caixa de Entrada |

