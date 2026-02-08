
# Plano: Página WhatsApp Dedicada para Super Admin

## Objetivo
Criar uma página `/super-admin/whatsapp` que abre em nova janela ao clicar no botão "WhatsApp" na aba Leads do Super Admin, seguindo o mesmo padrão já usado pelos tenants.

## Arquitetura

```text
TENANT (já existe):
┌──────────────────────────┐     window.open     ┌──────────────────────────┐
│  CRM (/:tenant/crm)      │ ─────────────────▶  │  /:tenant/whatsapp       │
│  [Botão WhatsApp]        │    '_blank'         │  (WhatsAppLayout)        │
└──────────────────────────┘                     └──────────────────────────┘

SUPER ADMIN (a criar):
┌──────────────────────────┐     window.open     ┌──────────────────────────┐
│  Super Admin (/leads)    │ ─────────────────▶  │  /super-admin/whatsapp   │
│  [Botão WhatsApp]        │    '_blank'         │  (SuperAdminWhatsApp)    │
└──────────────────────────┘                     └──────────────────────────┘
```

## Diferenças Chave

| Aspecto | Tenant WhatsApp | Super Admin WhatsApp |
|---------|-----------------|---------------------|
| Rota | `/:tenant/whatsapp` | `/super-admin/whatsapp` |
| Autenticação | TenantContext + AuthContext | useSuperAdmin |
| Filtro de Mensagens | `tenant_id = tenantId` | `tenant_id IS NULL` |
| Fonte de Leads | `leads_captacao` | `landing_leads` (homepage) |
| Instance Z-API | Config do tenant | Instance padrão (whatsapp-bot) |

## Arquivos a Criar

### 1. `src/pages/SuperAdminWhatsApp.tsx`
Página dedicada que verifica se é Super Admin e renderiza o layout.

```typescript
// Estrutura similar ao WhatsApp.tsx dos tenants
// Usa useSuperAdmin para verificar autenticação
// Renderiza SuperAdminWhatsAppLayout
```

### 2. `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout.tsx`
Layout principal com sidebar e conteúdo.

```typescript
// Estrutura igual ao WhatsAppLayout.tsx
// Renderiza SuperAdminWhatsAppSidebar + seções
```

### 3. `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppSidebar.tsx`
Sidebar com menu de navegação.

```typescript
// Estrutura igual ao WhatsAppSidebar.tsx
// Usa useSuperAdmin para info do usuário
// Botão voltar fecha a janela
```

### 4. `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppInbox.tsx`
Inbox adaptado para o Super Admin.

```typescript
// Estrutura similar ao WhatsAppInbox.tsx
// DIFERENÇA: busca mensagens onde tenant_id IS NULL
// Usa RPC ou query customizada
// Real-time + polling a cada 2 segundos
```

## Arquivos a Modificar

### 1. `src/components/SuperAdmin/SuperAdminLeads.tsx`
Adicionar botão "WhatsApp" ao lado de "Atualizar".

```typescript
// Importar MessageCircle do lucide-react
// Adicionar:
<Button 
  className="bg-green-600 hover:bg-green-700 text-white"
  onClick={() => window.open('/super-admin/whatsapp', '_blank')}
>
  <MessageCircle className="w-4 h-4 mr-2" />
  WhatsApp
</Button>
```

### 2. `src/App.tsx`
Adicionar rota `/super-admin/whatsapp`.

```typescript
// Importar SuperAdminWhatsApp
import SuperAdminWhatsApp from "@/pages/SuperAdminWhatsApp";

// Adicionar rota antes do wildcard 404
<Route path="/super-admin/whatsapp" element={<SuperAdminWhatsApp />} />
```

### 3. `supabase/functions/whatsapp-send-message/index.ts`
Adicionar suporte para modo Super Admin.

```typescript
// Se mode === 'superadmin':
// - Usar instance_name padrão 'whatsapp-bot'
// - Não definir tenant_id ao salvar mensagem (NULL)
```

## Migração SQL

Criar política RLS para Super Admin acessar mensagens sem tenant_id:

```sql
-- Super Admin pode gerenciar mensagens sem tenant (homepage leads)
CREATE POLICY "Super admins can manage whatsapp messages without tenant"
ON whatsapp_messages FOR ALL
USING (
  tenant_id IS NULL AND is_super_admin(auth.uid())
);
```

## Fluxo de Dados

```text
1. Super Admin clica "WhatsApp" na aba Leads
           │
           ▼
2. window.open('/super-admin/whatsapp', '_blank')
           │
           ▼
3. SuperAdminWhatsApp.tsx verifica autenticação
           │
           ▼
4. SuperAdminWhatsAppInbox busca:
   SELECT * FROM whatsapp_messages WHERE tenant_id IS NULL
           │
           ▼
5. Real-time + Polling atualizam a cada 2 segundos
           │
           ▼
6. Ao enviar mensagem:
   supabase.functions.invoke('whatsapp-send-message', {
     phone, message, mode: 'superadmin'
   })
           │
           ▼
7. Edge Function salva com tenant_id = NULL
```

## Estrutura de Pastas Final

```text
src/
├── pages/
│   ├── SuperAdmin.tsx          (existente)
│   └── SuperAdminWhatsApp.tsx  (NOVO)
│
├── components/
│   └── SuperAdmin/
│       ├── SuperAdminLeads.tsx (modificar - adicionar botão)
│       └── WhatsApp/           (NOVO diretório)
│           ├── SuperAdminWhatsAppLayout.tsx
│           ├── SuperAdminWhatsAppSidebar.tsx
│           └── SuperAdminWhatsAppInbox.tsx
```

## Resultado Esperado

1. Botão verde "WhatsApp" aparece ao lado de "Atualizar" na aba Leads
2. Ao clicar, abre nova janela com `/super-admin/whatsapp`
3. Interface igual à dos tenants (sidebar + chat)
4. Super Admin vê conversas de leads da homepage (tenant_id IS NULL)
5. Chat em tempo real funciona com polling a cada 2 segundos
6. Botão "voltar" fecha a janela (window.close)
