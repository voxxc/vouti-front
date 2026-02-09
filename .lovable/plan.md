
# Plano: Vouti.Bot como Drawer + Configurações com Menu Retrátil

## Entendimento do Problema

A implementação atual tem dois problemas:

1. **Configurações abre uma nova sidebar** - Deveria ser um dropdown/collapsible retrátil dentro da sidebar principal
2. **Vouti.Bot roda como página separada** - Deveria funcionar como drawer (igual CRMDrawer, AgendaDrawer) para maior celeridade

---

## Arquitetura Proposta

### 1. Vouti.Bot como Drawer

Transformar a interface WhatsApp em um drawer que abre sobre o dashboard, seguindo o mesmo padrão do CRMDrawer:

```text
┌────────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌──────────────────────────────────────────────┐ │
│  │ Sidebar     │  │                                              │ │
│  │ Principal   │  │         DRAWER VOUTI.BOT (side="inset")     │ │
│  │             │  │                                              │ │
│  │ - Projetos  │  │   ┌────────────┬────────────────────────┐   │ │
│  │ - Clientes  │  │   │ Sub-menu   │    Conteúdo da seção   │   │ │
│  │ - Agenda    │  │   │            │                        │   │ │
│  │ - ...       │  │   │ Inbox      │    Ex: Lista de        │   │ │
│  │ - Vouti.Bot │  │   │ Conversas  │    conversas           │   │ │
│  │             │  │   │ Kanban     │                        │   │ │
│  └─────────────┘  │   │ Config ▼   │                        │   │ │
│                   │   │  └ Conta   │                        │   │ │
│                   │   │  └ Agentes │                        │   │ │
│                   │   │  └ Times   │                        │   │ │
│                   │   └────────────┴────────────────────────┘   │ │
│                   └──────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 2. Configurações como Dropdown Retrátil (Collapsible)

Dentro do drawer do Vouti.Bot, o botão "Configurações" expande/colapsa um submenu com todas as opções:

```text
Sidebar do Drawer:
┌─────────────────────────┐
│ ← Vouti.Bot             │
├─────────────────────────┤
│ ○ Caixa de Entrada      │
│ ○ Conversas             │
│ ○ Kanban CRM            │
│ ○ Contatos              │
│ ○ Relatórios            │
│ ○ Campanhas             │
│ ○ Central de Ajuda      │
│ ▼ Configurações         │  ← Clicável, expande/colapsa
│   └ Conta               │
│   └ Agentes             │
│   └ Times               │
│   └ Caixas de Entrada   │
│   └ Etiquetas           │
│   └ Atributos           │
│   └ ... (16 itens)      │
└─────────────────────────┘
```

---

## Modificacoes Necessarias

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/components/WhatsApp/WhatsAppDrawer.tsx` | Drawer principal do Vouti.Bot (igual CRMDrawer) |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/WhatsApp/WhatsAppSidebar.tsx` | Adicionar Collapsible para Configuracoes com subitens |
| `src/components/WhatsApp/WhatsAppLayout.tsx` | Remover logica de settings separado, usar renderizacao normal |
| `src/components/Dashboard/DashboardLayout.tsx` | Adicionar WhatsAppDrawer ao sistema de drawers |
| `src/components/Dashboard/DashboardSidebar.tsx` | Adicionar 'whatsapp' ao tipo ActiveDrawer |

### Arquivos a Remover

| Arquivo | Motivo |
|---------|--------|
| `src/components/WhatsApp/settings/WhatsAppSettingsLayout.tsx` | Nao mais necessario |
| `src/components/WhatsApp/settings/WhatsAppSettingsSidebar.tsx` | Nao mais necessario |

---

## Detalhes Tecnicos

### 1. WhatsAppDrawer.tsx (Novo)

Estrutura similar ao CRMDrawer:

```typescript
export function WhatsAppDrawer({ open, onOpenChange }: WhatsAppDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="inset" className="p-0 flex flex-col">
        <SheetTitle className="sr-only">Vouti.Bot</SheetTitle>
        
        <div className="flex h-full">
          {/* Sidebar interna do WhatsApp */}
          <WhatsAppSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
          
          {/* Conteudo da secao ativa */}
          <main className="flex-1 overflow-hidden">
            {renderSection()}
          </main>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### 2. WhatsAppSidebar.tsx (Modificar)

Usar Collapsible para Configuracoes:

```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

// Dentro do componente:
const [settingsOpen, setSettingsOpen] = useState(false);

// No JSX:
<Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
  <CollapsibleTrigger asChild>
    <Button variant="ghost" className="w-full justify-between">
      <span className="flex items-center gap-3">
        <Settings className="h-4 w-4" />
        Configuracoes
      </span>
      {settingsOpen ? <ChevronDown /> : <ChevronRight />}
    </Button>
  </CollapsibleTrigger>
  <CollapsibleContent className="pl-6 space-y-1">
    {settingsMenuItems.map((item) => (
      <Button
        key={item.id}
        variant={activeSection === item.id ? "secondary" : "ghost"}
        className="w-full justify-start gap-2 h-8 text-sm"
        onClick={() => onSectionChange(item.id)}
      >
        <item.icon className="h-3 w-3" />
        {item.label}
      </Button>
    ))}
  </CollapsibleContent>
</Collapsible>
```

### 3. DashboardSidebar.tsx (Modificar)

Adicionar ao tipo e lista de items:

```typescript
export type ActiveDrawer = 'projetos' | 'agenda' | 'clientes' | 'financeiro' | 
                           'controladoria' | 'reunioes' | 'documentos' | 'whatsapp' | null;

// Novo item no menu (se WhatsApp habilitado):
{ id: "whatsapp", label: "Vouti.Bot", icon: MessageCircle }
```

### 4. DashboardLayout.tsx (Modificar)

Adicionar o drawer:

```typescript
import { WhatsAppDrawer } from "@/components/WhatsApp/WhatsAppDrawer";

// Junto aos outros drawers:
<WhatsAppDrawer 
  open={activeDrawer === 'whatsapp'} 
  onOpenChange={(open) => !open && setActiveDrawer(null)} 
/>
```

---

## Fluxo do Usuario

1. Usuario clica em "Vouti.Bot" na sidebar do dashboard
2. Drawer abre com `side="inset"` (ocupa area de conteudo, sidebar fica visivel)
3. Dentro do drawer, sidebar interna com menu:
   - Inbox, Conversas, Kanban, etc.
   - "Configuracoes" com chevron que expande subitens
4. Ao clicar em subitem de configuracao, conteudo carrega no lado direito
5. Clicar fora ou no X fecha o drawer

---

## Beneficios

1. **Celeridade**: Drawer abre instantaneamente sem navegacao de pagina
2. **Consistencia**: Segue mesmo padrao de CRMDrawer, AgendaDrawer
3. **Minimalismo**: Configuracoes como dropdown retratil, nao sidebar separada
4. **Sidebar sempre visivel**: Usuario pode trocar de modulo rapidamente (modal={false})
5. **Contexto preservado**: Nao perde estado do dashboard ao abrir Vouti.Bot
