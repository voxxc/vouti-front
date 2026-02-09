
# Plano: Unificar Interface do Vouti.Bot entre Super Admin e Tenants

## Problema Atual

O Super Admin tem uma interface de Vouti.Bot diferente da dos Tenants:

| Aspecto | Tenant | Super Admin |
|---------|--------|-------------|
| Menu Config | Collapsible com 16 itens | Dropdown com 4 itens |
| Seções | account, agents, teams, inboxes, labels, attributes, kanban-settings, automation, n8n, bots, typebot, macros, canned, apps, integrations, permissions | agents, settings, settings-leads, ai-settings |
| Estilo | ScrollArea com Collapsible | DropdownMenu simples |

## Solucao

Refatorar os componentes do Super Admin para usar a mesma estrutura dos Tenants, mantendo apenas a diferenca de contexto (tenant_id = null).

## Alteracoes Necessarias

### 1. `SuperAdminWhatsAppLayout.tsx` - Adicionar todas as secoes

Adicionar os mesmos cases que o WhatsAppLayout.tsx:

```typescript
// Adicionar imports
import { WhatsAppAccountSettings } from "@/components/WhatsApp/settings/WhatsAppAccountSettings";
import { WhatsAppTeamsSettings } from "@/components/WhatsApp/settings/WhatsAppTeamsSettings";
import { WhatsAppInboxSettings } from "@/components/WhatsApp/settings/WhatsAppInboxSettings";
// ... todos os 16 imports de settings

// Atualizar type
export type SuperAdminWhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban"
  | "contacts" 
  | "reports"
  | "campaigns"
  | "help"
  // Settings sections (igual ao tenant)
  | "account"
  | "agents"
  | "teams"
  | "inboxes"
  | "labels"
  | "attributes"
  | "kanban-settings"
  | "automation"
  | "n8n"
  | "bots"
  | "typebot"
  | "macros"
  | "canned"
  | "apps"
  | "integrations"
  | "permissions";

// Atualizar renderSection com todos os cases
```

### 2. `SuperAdminWhatsAppSidebar.tsx` - Usar Collapsible igual ao Tenant

Substituir o DropdownMenu por Collapsible com ScrollArea, usando os mesmos 16 itens de configuracao:

```typescript
// Imports
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mesmo settingsMenuItems do WhatsAppSidebar
const settingsMenuItems = [
  { id: "account", label: "Conta", icon: User },
  { id: "agents", label: "Agentes", icon: Users2 },
  { id: "teams", label: "Times", icon: UsersRound },
  { id: "inboxes", label: "Caixas de Entrada", icon: Inbox },
  { id: "labels", label: "Etiquetas", icon: Tag },
  { id: "attributes", label: "Atributos", icon: Sliders },
  { id: "kanban-settings", label: "Kanban CRM", icon: Columns3 },
  { id: "automation", label: "Automacao", icon: Zap },
  { id: "n8n", label: "N8N", icon: Workflow },
  { id: "bots", label: "Bots", icon: Bot },
  { id: "typebot", label: "Typebot Bot", icon: MessageSquare },
  { id: "macros", label: "Macros", icon: FileText },
  { id: "canned", label: "Respostas Prontas", icon: MessageCircle },
  { id: "apps", label: "Aplicacoes", icon: AppWindow },
  { id: "integrations", label: "Integracoes", icon: Plug },
  { id: "permissions", label: "Permissoes", icon: Shield },
];

// Usar Collapsible ao inves de DropdownMenu
```

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout.tsx` | Adicionar imports e cases para todas as 16 secoes de settings |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx` | Substituir Dropdown por Collapsible, adicionar todos os 16 itens de menu |

## Resultado Esperado

Apos as alteracoes, o Super Admin tera a mesma interface visual e funcional que os Tenants:

- Menu Configuracoes com Collapsible expandivel
- Todas as 16 secoes de configuracao acessiveis
- ScrollArea para navegacao quando muitos itens
- Mesmo estilo visual e comportamento de selecao

A unica diferenca sera o contexto (tenant_id = null para Super Admin), que e tratado internamente por cada componente de settings.
