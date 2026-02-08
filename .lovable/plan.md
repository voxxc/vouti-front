
# Plano: Corrigir Permissão de UPDATE na Tabela Tenants

## Problema Identificado

A configuração "Fonte de Lead" (`whatsapp_lead_source`) **não está sendo salva** porque a tabela `tenants` não permite UPDATE para usuários normais.

### Diagnóstico

| Consulta | Resultado |
|----------|-----------|
| `settings` do tenant demorais | `{ "whatsapp_enabled": true }` |
| `whatsapp_lead_source` no banco | **Ausente** |

### Políticas RLS Atuais

```text
tenants:
├── SELECT: "Public can view active tenants by slug" ✅
├── SELECT: "Super admins can view all tenants" ✅
├── SELECT: "Users can view their own tenant" ✅
└── ALL: "Super admins can manage tenants" ✅
    └── (somente super_admins podem UPDATE)
```

**Problema**: Nenhuma política permite que **admins do próprio tenant** façam UPDATE nas settings.

## Solução

Criar uma política RLS que permita admins atualizarem as settings do próprio tenant.

### Nova Política RLS

```sql
CREATE POLICY "Tenant admins can update own tenant settings"
ON tenants
FOR UPDATE
TO authenticated
USING (id = get_user_tenant_id())
WITH CHECK (id = get_user_tenant_id());
```

**Nota**: Esta política permite que qualquer usuário autenticado do tenant atualize o registro do tenant. Se quiser restringir apenas para admins:

```sql
CREATE POLICY "Tenant admins can update own tenant settings"
ON tenants
FOR UPDATE
TO authenticated
USING (
  id = get_user_tenant_id() 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND tenant_id = id 
    AND role = 'admin'
  )
)
WITH CHECK (
  id = get_user_tenant_id() 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND tenant_id = id 
    AND role = 'admin'
  )
);
```

## Alterações Necessárias

| Tipo | Descrição |
|------|-----------|
| **Database Migration** | Adicionar política RLS para UPDATE na tabela `tenants` |

## Fluxo Após Correção

```text
Admin clica "Landing Pages do Escritório"
       │
       ▼
updateFeature('whatsapp_lead_source', 'leads_captacao')
       │
       ▼
supabase.from('tenants').update({ settings: {...} })
       │
       ▼ (RLS permite UPDATE pois é admin do próprio tenant)
       │
Banco atualiza settings = { whatsapp_enabled: true, whatsapp_lead_source: 'leads_captacao' }
       │
       ▼
Ao mudar de página, TenantContext recarrega com valor correto
```

## Resultado Esperado

1. Admin do tenant DEMORAIS consegue salvar "Fonte de Lead"
2. Configuração persiste ao mudar de página
3. Valor carrega corretamente do banco na próxima visita
