
# Plano: Corrigir Interface WhatsApp do Super Admin

## Problema Identificado

A interface WhatsApp do Super Admin está diferente do padrão usado pelos tenants:

| Aspecto | Padrão (Tenant) | Super Admin (Atual) |
|---------|-----------------|---------------------|
| Itens de Menu | 8 itens | 4 itens |
| Badge "SUPER ADMIN" | Não tem | Tem |
| Seções | inbox, conversations, kanban, contacts, reports, campaigns, help, settings | inbox, conversations, contacts, settings |

## Alterações Necessárias

### 1. Atualizar `SuperAdminWhatsAppLayout.tsx`

Adicionar todas as 8 seções que existem no WhatsAppLayout dos tenants:

```typescript
export type SuperAdminWhatsAppSection = 
  | "inbox" 
  | "conversations" 
  | "kanban"      // ADICIONAR
  | "contacts" 
  | "reports"     // ADICIONAR
  | "campaigns"   // ADICIONAR
  | "help"        // ADICIONAR
  | "settings";
```

E adicionar os cases no switch para cada seção.

### 2. Atualizar `SuperAdminWhatsAppSidebar.tsx`

Adicionar todos os 8 itens de menu e remover a badge "SUPER ADMIN":

```typescript
const menuItems = [
  { id: "inbox", label: "Caixa de Entrada", icon: Inbox },
  { id: "conversations", label: "Conversas", icon: MessageSquare },
  { id: "kanban", label: "Kanban CRM", icon: Columns3 },      // ADICIONAR
  { id: "contacts", label: "Contatos", icon: Users },
  { id: "reports", label: "Relatórios", icon: BarChart3 },    // ADICIONAR
  { id: "campaigns", label: "Campanhas", icon: Megaphone },   // ADICIONAR
  { id: "help", label: "Central de Ajuda", icon: HelpCircle },// ADICIONAR
  { id: "settings", label: "Configurações", icon: Settings },
];
```

E remover o bloco:
```jsx
{/* Super Admin Badge */}
<div className="px-4 py-2 bg-primary/10 border-b border-border">
  <span className="text-xs font-medium text-primary">SUPER ADMIN</span>
</div>
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout.tsx` | Adicionar 4 seções faltantes ao tipo e switch |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx` | Adicionar 4 itens de menu + remover badge SUPER ADMIN |

## Resultado Esperado

A interface `/super-admin/whatsapp` ficará idêntica à `/:tenant/whatsapp`:
- 8 itens de menu na sidebar
- Sem badge "SUPER ADMIN" 
- Layout igual ao print de referência
