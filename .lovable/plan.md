
# Plano: Caixa de Entrada com Drawer em 2o Plano + Sistema de Agentes

## Resumo das Alteracoes

O usuario solicitou tres funcionalidades principais:

1. **Caixa de Entrada como Drawer com carregamento em 2o plano** - As conversas devem ser pre-carregadas e atualizadas silenciosamente a cada 2 segundos
2. **Sistema de Agentes** - Cadastro de agentes com nome e funcao, cada um com seu proprio card de configuracoes Z-API
3. **Primeiro agente pre-criado** - Card do "Daniel" com as configuracoes Z-API existentes

---

## Arquitetura

### 1. Carregamento em Segundo Plano (Inbox)

O componente `WhatsAppInbox` ja possui polling de 2 segundos. A melhoria sera:

- Mover a logica de carregamento para o nivel do `WhatsAppDrawer`
- Pre-carregar conversas assim que o drawer abre (mesmo em outra secao)
- Manter estado compartilhado entre secoes

```text
WhatsAppDrawer (estado compartilhado)
├── conversations[]     ← carregado em 2o plano sempre
├── polling a cada 2s   ← atualiza silenciosamente
│
└── renderSection()
    ├── WhatsAppInbox   ← recebe conversations via props
    ├── WhatsAppAgents  ← nova tela de agentes
    └── ...outras secoes
```

### 2. Sistema de Agentes

#### Nova Tabela: `whatsapp_agents`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | FK para tenants |
| user_id | uuid | FK para profiles (opcional) |
| name | text | Nome do agente |
| role | text | Funcao (admin, atendente, etc) |
| whatsapp_instance_id | uuid | FK para whatsapp_instances (opcional) |
| is_active | boolean | Se o agente esta ativo |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

#### Fluxo de Cadastro

1. Usuario clica em "Adicionar Agente"
2. Dialog solicita: Nome + Funcao
3. Ao salvar, cria registro em `whatsapp_agents`
4. Card do agente aparece na listagem
5. Ao clicar no card, abre drawer lateral com configuracoes Z-API individuais

---

## Arquivos a Modificar

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/WhatsApp/settings/AgentCard.tsx` | Card do agente na listagem |
| `src/components/WhatsApp/settings/AgentConfigDrawer.tsx` | Drawer de configuracoes do agente (Z-API) |
| `src/components/WhatsApp/settings/AddAgentDialog.tsx` | Dialog para adicionar novo agente |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Adicionar estado compartilhado + polling global |
| `src/components/WhatsApp/sections/WhatsAppInbox.tsx` | Receber conversations via props (opcional) |
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Implementar listagem + cadastro de agentes |

---

## Detalhes de Implementacao

### 1. WhatsAppDrawer - Estado Compartilhado

```typescript
export function WhatsAppDrawer({ open, onOpenChange }) {
  const { tenantId } = useTenantId();
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  
  // Pre-carregar conversas em 2o plano
  useEffect(() => {
    if (!open || !tenantId) return;
    
    loadConversations();
    
    // Polling silencioso a cada 2s
    const interval = setInterval(() => {
      loadConversations();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [open, tenantId]);
  
  // ... passar conversations para WhatsAppInbox via props ou context
}
```

### 2. WhatsAppAgentsSettings - Listagem de Agentes

```typescript
export const WhatsAppAgentsSettings = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  return (
    <div className="h-full overflow-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1>Agentes</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus /> Adicionar Agente
        </Button>
      </div>
      
      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(agent => (
          <AgentCard 
            key={agent.id} 
            agent={agent} 
            onClick={() => setSelectedAgent(agent)}
          />
        ))}
      </div>
      
      {/* Dialog para adicionar */}
      <AddAgentDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
      />
      
      {/* Drawer de configuracoes do agente */}
      <AgentConfigDrawer 
        agent={selectedAgent}
        open={!!selectedAgent}
        onOpenChange={() => setSelectedAgent(null)}
      />
    </div>
  );
};
```

### 3. AgentCard - Card do Agente

```typescript
export const AgentCard = ({ agent, onClick }) => {
  return (
    <Card 
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{agent.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">{agent.name}</CardTitle>
            <CardDescription>{agent.role}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            "w-2 h-2 rounded-full",
            agent.isConnected ? "bg-green-500" : "bg-gray-400"
          )} />
          <span>{agent.isConnected ? "Conectado" : "Desconectado"}</span>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 4. AgentConfigDrawer - Configuracoes do Agente

O drawer lateral tera as mesmas configuracoes Z-API que ja existem em `WhatsAppSettings.tsx`:
- Status da conexao (conectado/desconectado)
- Credenciais Z-API (URL, Instance ID, Token)
- Botao Conectar (gera QR Code)
- Botao Resetar

### 5. Primeiro Agente: Daniel

Ao implementar, ja criar o registro inicial:

```sql
INSERT INTO whatsapp_agents (tenant_id, name, role, is_active)
VALUES ('d395b3a1-1ea1-4710-bcc1-ff5f6a279750', 'Daniel', 'admin', true);
```

E vincular a instancia Z-API existente a ele.

---

## Migracao do Banco de Dados

```sql
-- Criar tabela de agentes
CREATE TABLE whatsapp_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES profiles(user_id),
  name TEXT NOT NULL,
  role TEXT DEFAULT 'atendente',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar referencia na tabela de instancias
ALTER TABLE whatsapp_instances 
ADD COLUMN agent_id UUID REFERENCES whatsapp_agents(id);

-- RLS
ALTER TABLE whatsapp_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agents in their tenant" ON whatsapp_agents
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage agents in their tenant" ON whatsapp_agents
  FOR ALL USING (tenant_id = get_user_tenant_id() AND is_admin_or_controller_in_tenant());
```

---

## Resultado Esperado

1. **Drawer Vouti.Bot abre** - Conversas comecam a carregar em 2o plano
2. **Navegando entre secoes** - Conversas continuam atualizando (polling 2s)
3. **Secao Agentes** - Mostra grid de cards
   - Card "Daniel" ja aparece com status de conexao
4. **Clicar no card** - Abre drawer lateral com configuracoes Z-API
5. **Botao "Adicionar Agente"** - Dialog simples (Nome + Funcao)
6. **Novo agente** - Aparece na grid, pode configurar Z-API individual

---

## Interface Visual

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  AGENTES                                           [+ Adicionar Agente] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐ │
│  │  👤 Daniel         │  │  👤 Maria          │  │  👤 Pedro          │ │
│  │  Admin             │  │  Atendente         │  │  Atendente         │ │
│  │  ● Conectado       │  │  ○ Desconectado    │  │  ○ Desconectado    │ │
│  │  [Clique p/ config]│  │                    │  │                    │ │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Ao clicar em "Daniel":

┌──────────────────────────────────────────────────┬──────────────────────┐
│                                                  │ Configuracoes        │
│          (Grid de Agentes - esmaecido)           │ ─────────────────    │
│                                                  │ Agente: Daniel       │
│                                                  │                      │
│                                                  │ Status: ● Conectado  │
│                                                  │                      │
│                                                  │ Credenciais Z-API    │
│                                                  │ URL: [...]           │
│                                                  │ Instance: [...]      │
│                                                  │ Token: [...]         │
│                                                  │                      │
│                                                  │ [Salvar] [Resetar]   │
└──────────────────────────────────────────────────┴──────────────────────┘
```
