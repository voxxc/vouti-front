
# Plano: Adicionar Botões WhatsApp e Landing Pages ao CRMContent

## Problema
O `CRMContent.tsx` (usado no drawer de Clientes) está sem os botões de **WhatsApp** e **Landing Pages** que existem na página CRM principal.

## Solução
Adicionar os dois botões ao lado das tabs (Clientes | CAPTAÇÃO), mantendo a mesma funcionalidade da página CRM:
- **WhatsApp**: Abre `/:tenant/whatsapp` em nova janela
- **Landing Pages**: Abre dialog para selecionar landing pages

## Layout Proposto

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Clientes]  [CAPTAÇÃO]                    [WhatsApp 🟢] [Landing Pages]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  🔍 Buscar...           [Filtro Status]            [+ Novo Cliente]        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Lista de clientes...                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Alterações em `src/components/CRM/CRMContent.tsx`

### 1. Adicionar Imports Necessários
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Layout, ExternalLink } from "lucide-react";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
```

### 2. Adicionar Estados e Hooks
```typescript
const { isWhatsAppEnabled } = useTenantFeatures();
const [isLandingPagesDialogOpen, setIsLandingPagesDialogOpen] = useState(false);
```

### 3. Adicionar Função para Abrir WhatsApp
```typescript
const handleOpenWhatsApp = () => {
  window.open(tenantPath('/whatsapp'), '_blank');
};
```

### 4. Modificar Layout das Tabs
Adicionar container flex com tabs à esquerda e botões à direita:

```typescript
<div className="flex items-center justify-between border-b">
  <TabsList className="justify-start rounded-none h-auto p-0 bg-transparent">
    <TabsTrigger value="clientes" ...>Clientes</TabsTrigger>
    <TabsTrigger value="captacao" ...>CAPTAÇÃO</TabsTrigger>
  </TabsList>
  
  <div className="flex gap-2 pb-2">
    {isWhatsAppEnabled && (
      <Button 
        variant="default"
        size="sm"
        className="gap-1 bg-green-600 hover:bg-green-700"
        onClick={handleOpenWhatsApp}
      >
        <MessageCircle size={14} />
        WhatsApp
        <ExternalLink size={12} />
      </Button>
    )}
    <Button 
      variant="outline"
      size="sm"
      className="gap-1"
      onClick={() => setIsLandingPagesDialogOpen(true)}
    >
      <Layout size={14} />
      LPs
    </Button>
  </div>
</div>
```

### 5. Adicionar Dialog de Landing Pages
Copiar o dialog da página CRM para dentro do componente.

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/CRM/CRMContent.tsx` | Adicionar botões WhatsApp e Landing Pages + dialog |

## Resultado Visual

O drawer de Clientes terá:
- Tabs (Clientes | CAPTAÇÃO) alinhadas à esquerda
- Botões (WhatsApp | LPs) alinhados à direita na mesma linha
- WhatsApp só aparece se `isWhatsAppEnabled` for true
- Botão WhatsApp verde com ícone de link externo
- Botão Landing Pages abre dialog com opções
