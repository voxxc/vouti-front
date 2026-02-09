

# Plano: Renomear Rotas de /whatsapp para /bot

## Resumo

Alterar todas as rotas e referências de `/whatsapp` para `/bot` no sistema, tanto para tenants quanto para o Super Admin.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Mudar rota `/:tenant/whatsapp` → `/:tenant/bot` e `/super-admin/whatsapp` → `/super-admin/bot` |
| `src/components/Dashboard/DashboardSidebar.tsx` | Mudar `route: '/whatsapp'` → `route: '/bot'` e referências no id/drawer |
| `src/pages/CRM.tsx` | Mudar `tenantPath('/whatsapp')` → `tenantPath('/bot')` |
| `src/components/CRM/CRMContent.tsx` | Mudar `tenantPath('/whatsapp')` → `tenantPath('/bot')` |
| `src/components/SuperAdmin/SuperAdminLeads.tsx` | Mudar `/super-admin/whatsapp` → `/super-admin/bot` |

## Detalhes Técnicos

### 1. `src/App.tsx`

**Linha 373:**
```typescript
// De:
<Route path="/:tenant/whatsapp" element={...}>

// Para:
<Route path="/:tenant/bot" element={...}>
```

**Linha 604:**
```typescript
// De:
<Route path="/super-admin/whatsapp" element={<SuperAdminWhatsApp />} />

// Para:
<Route path="/super-admin/bot" element={<SuperAdminWhatsApp />} />
```

### 2. `src/components/Dashboard/DashboardSidebar.tsx`

**Linha 137:**
```typescript
// De:
{ id: 'whatsapp', icon: MessageSquare, label: 'Vouti.Bot', route: '/whatsapp' },

// Para:
{ id: 'whatsapp', icon: MessageSquare, label: 'Vouti.Bot', route: '/bot' },
```

### 3. `src/pages/CRM.tsx`

**Linha 51:**
```typescript
// De:
window.open(tenantPath('/whatsapp'), '_blank');

// Para:
window.open(tenantPath('/bot'), '_blank');
```

### 4. `src/components/CRM/CRMContent.tsx`

**Linha 69:**
```typescript
// De:
window.open(tenantPath('/whatsapp'), '_blank');

// Para:
window.open(tenantPath('/bot'), '_blank');
```

### 5. `src/components/SuperAdmin/SuperAdminLeads.tsx`

**Linha 107:**
```typescript
// De:
window.open('/super-admin/whatsapp', '_blank');

// Para:
window.open('/super-admin/bot', '_blank');
```

## Resultado

| Rota Antiga | Rota Nova |
|-------------|-----------|
| `/:tenant/whatsapp` | `/:tenant/bot` |
| `/super-admin/whatsapp` | `/super-admin/bot` |

Os nomes internos de componentes e arquivos (como `WhatsApp.tsx`, `WhatsAppLayout.tsx`) permanecerão iguais - apenas as URLs visíveis ao usuário serão alteradas.

