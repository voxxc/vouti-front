
# Plano: Ativacao do Vouti.Bot via Super Admin + Acesso Condicional nos Tenants

## Resumo

O usuario solicitou:
1. **Ativacao via Super Admin** - Adicionar botao no card de cada tenant para ativar/desativar o Vouti.Bot
2. **Acesso condicional** - O menu Vouti.Bot no sidebar dos tenants so deve aparecer quando ativado pelo Super Admin
3. **Paridade Super Admin** - O padrao de Agentes do Vouti.Bot deve estar disponivel tambem no Super Admin

---

## Arquitetura da Solucao

### 1. Feature Flag

O sistema ja utiliza o campo `settings` (JSONB) na tabela `tenants` para armazenar `whatsapp_enabled`. A estrutura existente sera mantida:

```json
{
  "whatsapp_enabled": true,
  "whatsapp_lead_source": "landing_leads"
}
```

### 2. Fluxo de Ativacao

```text
Super Admin (TenantCard)
        │
        ├── Botao Vouti.Bot (Cloud icon)
        │   └── Toggle: Ativado/Desativado
        │
        └── UPDATE tenants SET settings = jsonb_set(settings, '{whatsapp_enabled}', 'true')
                    │
                    ▼
            Tenant Dashboard
                    │
                    └── useTenantFeatures().isWhatsAppEnabled
                            │
                            ├── TRUE: Mostra menu Vouti.Bot no sidebar
                            └── FALSE: Esconde menu Vouti.Bot
```

---

## Alteracoes Necessarias

### 1. TenantCard.tsx - Botao de Ativacao

Adicionar um botao com icone de nuvem (CloudIcon) na linha de ferramentas do card:

| Elemento | Descricao |
|----------|-----------|
| Icone | CloudIcon (mesmo do Vouti.Bot) |
| Comportamento | Toggle - ativa/desativa `whatsapp_enabled` nas settings |
| Visual | Cor verde quando ativo, cinza quando inativo |
| Tooltip | "Vouti.Bot: Ativado" ou "Vouti.Bot: Desativado" |

```typescript
// Novo estado local para loading
const [whatsAppLoading, setWhatsAppLoading] = useState(false);

// Extrair status atual das settings
const isWhatsAppEnabled = (tenant.settings as Record<string, unknown>)?.whatsapp_enabled === true;

// Handler para toggle
const handleToggleWhatsApp = async () => {
  setWhatsAppLoading(true);
  const newSettings = {
    ...(tenant.settings as Record<string, unknown>),
    whatsapp_enabled: !isWhatsAppEnabled
  };
  
  await supabase
    .from('tenants')
    .update({ settings: newSettings })
    .eq('id', tenant.id);
    
  // Atualizar UI...
  setWhatsAppLoading(false);
};
```

### 2. DashboardSidebar.tsx - Acesso Condicional

Modificar a logica de visibilidade para incluir verificacao de `whatsapp`:

```typescript
// Adicionar hook
const { isWhatsAppEnabled } = useTenantFeatures();

// Modificar hasAccessToItem
const hasAccessToItem = (itemId: string) => {
  if (itemId === 'dashboard' || itemId === 'extras') return true;
  
  // Vouti.Bot - verificar feature flag
  if (itemId === 'whatsapp') {
    return isWhatsAppEnabled && userRoles.includes('admin');
  }
  
  return hasAccess(itemId);
};
```

### 3. SuperAdminWhatsAppLayout.tsx - Adicionar Seção de Agentes

Atualizar para incluir a secao de Agentes criada anteriormente:

```typescript
// Adicionar ao type
export type SuperAdminWhatsAppSection = 
  | "inbox" 
  | "conversations" 
  // ... existentes ...
  | "agents"  // NOVO

// Adicionar ao renderSection
case "agents":
  return <WhatsAppAgentsSettings isSuperAdmin />;
```

### 4. SuperAdminWhatsAppSidebar.tsx - Adicionar Menu Agentes

Adicionar item no menu de configuracoes:

```typescript
const settingsItems = [
  { id: "agents", label: "Agentes", icon: Users },  // NOVO
  { id: "settings", label: "Conexão Z-API", icon: Wifi },
  { id: "settings-leads", label: "Fonte de Leads", icon: Users2 },
  { id: "ai-settings", label: "Agente IA", icon: Bot },
];
```

---

## Interface Visual - TenantCard

```text
┌────────────────────────────────────────────────────────┐
│  [Logo] Escritório ABC                    [Switch On]  │
│         escritorio-abc                                 │
│                                                        │
│  🟢 Ativo   |   Solo                                   │
├────────────────────────────────────────────────────────┤
│  [Configurar ▼]              [↗ Abrir]  [🗑 Excluir]   │
│                                                        │
│  [📊] [📈] [🔑] [📁] [#] [💳]  [☁️]  ◄── NOVO BOTAO   │
│                                │                       │
│                         Vouti.Bot Toggle               │
│                         (verde = ativo)                │
└────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/SuperAdmin/TenantCard.tsx` | Adicionar botao toggle Vouti.Bot |
| `src/components/Dashboard/DashboardSidebar.tsx` | Condicionar exibicao do menu ao feature flag |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout.tsx` | Adicionar secao "agents" |
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx` | Adicionar menu Agentes |
| `src/components/WhatsApp/settings/WhatsAppAgentsSettings.tsx` | Adicionar prop `isSuperAdmin` (opcional) |

---

## Callback para Atualizar UI

O `TenantCard` precisara de um callback para notificar o componente pai quando as settings forem alteradas, para refletir a mudanca na UI:

```typescript
interface TenantCardProps {
  // ... existentes ...
  onSettingsChange?: (tenantId: string, settings: unknown) => void;
}
```

---

## Resultado Esperado

1. **Super Admin** - Card do tenant tera botao com icone de nuvem
   - Clique alterna `whatsapp_enabled` entre true/false
   - Visual indica status (verde = ativo, cinza = inativo)

2. **Dashboard Tenant** - Menu lateral
   - Se `whatsapp_enabled = true`: Menu Vouti.Bot aparece
   - Se `whatsapp_enabled = false`: Menu Vouti.Bot nao aparece

3. **Super Admin Vouti.Bot** - Pagina `/super-admin/whatsapp`
   - Tera a mesma secao de Agentes dos tenants
   - Gerencia instancias Z-API globais (homepage leads)
