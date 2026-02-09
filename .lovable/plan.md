

# Plano: Corrigir Gestão de Agentes no Super Admin

## Problema Identificado

Os componentes de gerenciamento de agentes (`WhatsAppAgentsSettings`, `AddAgentDialog`, `AgentConfigDrawer`) dependem do hook `useTenantId()` que retorna `null` no contexto do Super Admin.

Isso causa:

1. **Loading infinito**: O `useEffect` em `WhatsAppAgentsSettings` (linha 17-21) nunca executa `loadAgents()` porque `tenantId` é `null`
2. **Impossível criar agentes**: O `AddAgentDialog` verifica `if (!tenantId)` e mostra erro
3. **Drawer não funciona**: O `AgentConfigDrawer` usa `tenantId` para buscar/salvar configurações

## Solução

Criar versões específicas para o Super Admin que usem `tenant_id IS NULL` (conforme memória do sistema):

### 1. Novo arquivo: `SuperAdminAgentsSettings.tsx`

Cópia adaptada de `WhatsAppAgentsSettings` que:
- Remove dependência de `useTenantId()`
- Busca agentes onde `tenant_id IS NULL`
- Usa dialog e drawer específicos para Super Admin

```typescript
// Diferença principal na query:
const { data } = await supabase
  .from("whatsapp_agents")
  .select("*")
  .is("tenant_id", null)  // <-- IS NULL ao invés de .eq()
  .order("created_at", { ascending: true });
```

### 2. Novo arquivo: `SuperAdminAddAgentDialog.tsx`

Cópia adaptada de `AddAgentDialog` que:
- Não exige `tenantId`
- Insere agente com `tenant_id: null`

```typescript
const { error } = await supabase
  .from("whatsapp_agents")
  .insert({
    tenant_id: null,  // <-- Explicitamente null
    name: name.trim(),
    role,
    is_active: true,
  });
```

### 3. Novo arquivo: `SuperAdminAgentConfigDrawer.tsx`

Cópia adaptada de `AgentConfigDrawer` que:
- Busca instâncias onde `tenant_id IS NULL`
- Salva instâncias com `tenant_id: null`

```typescript
// Busca
const { data } = await supabase
  .from("whatsapp_instances")
  .select("*")
  .is("tenant_id", null)
  .eq("agent_id", agent.id)
  .maybeSingle();

// Insert
await supabase
  .from("whatsapp_instances")
  .insert({
    tenant_id: null,  // <-- Explicitamente null
    agent_id: agent.id,
    // ...
  });
```

### 4. Atualizar `SuperAdminWhatsAppLayout.tsx`

Substituir o uso de `WhatsAppAgentsSettings` por `SuperAdminAgentsSettings` no case `"agents"`:

```typescript
case "agents":
  return <SuperAdminAgentsSettings />;
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentsSettings.tsx` | Listagem de agentes (tenant_id IS NULL) |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAddAgentDialog.tsx` | Dialog para criar agente (tenant_id: null) |
| `src/components/SuperAdmin/WhatsApp/SuperAdminAgentConfigDrawer.tsx` | Drawer de config Z-API (tenant_id IS NULL) |

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/SuperAdmin/WhatsApp/SuperAdminWhatsAppLayout.tsx` | Usar `SuperAdminAgentsSettings` no case "agents" |

## Fluxo Corrigido

```text
Super Admin acessa /super-admin/bot → Seção "Agentes"
                    │
                    ▼
      SuperAdminAgentsSettings.tsx
      (query: tenant_id IS NULL)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
SuperAdminAddAgentDialog    SuperAdminAgentConfigDrawer
(insert: tenant_id: null)   (query/insert: tenant_id IS NULL/null)
```

## Resultado Esperado

- Super Admin pode visualizar agentes sem tenant
- Super Admin pode criar novos agentes com tenant_id = null
- Super Admin pode configurar Z-API para cada agente
- Loading será resolvido imediatamente ao carregar a página

