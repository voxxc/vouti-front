

# Plano: Adicionar Políticas RLS para Super Admin na Tabela whatsapp_agents

## Problema Identificado

A criação de agentes no `/super-admin/bot` falha porque as políticas RLS da tabela `whatsapp_agents` bloqueiam operações quando `tenant_id` é `NULL`.

### Políticas Atuais (Problemáticas)

| Operação | Condição | Resultado para Super Admin |
|----------|----------|---------------------------|
| SELECT | `tenant_id = get_user_tenant_id()` | `NULL = NULL` → `NULL` (bloqueado) |
| INSERT | `tenant_id = get_user_tenant_id()` | `NULL = NULL` → `NULL` (bloqueado) |
| UPDATE | `tenant_id = get_user_tenant_id()` | `NULL = NULL` → `NULL` (bloqueado) |
| DELETE | `tenant_id = get_user_tenant_id()` | `NULL = NULL` → `NULL` (bloqueado) |

O Super Admin não tem `tenant_id`, então `get_user_tenant_id()` retorna `NULL`, e em SQL `NULL = NULL` não é `TRUE`.

## Solução

Adicionar políticas RLS específicas para Super Admin usando `is_super_admin(auth.uid())`, seguindo o mesmo padrão já usado em outras tabelas do sistema.

## Migração SQL Necessária

```sql
-- Política para Super Admin SELECT
CREATE POLICY "superadmin_select_agents" ON public.whatsapp_agents
  FOR SELECT TO public
  USING (is_super_admin(auth.uid()));

-- Política para Super Admin INSERT  
CREATE POLICY "superadmin_insert_agents" ON public.whatsapp_agents
  FOR INSERT TO public
  WITH CHECK (is_super_admin(auth.uid()));

-- Política para Super Admin UPDATE
CREATE POLICY "superadmin_update_agents" ON public.whatsapp_agents
  FOR UPDATE TO public
  USING (is_super_admin(auth.uid()));

-- Política para Super Admin DELETE
CREATE POLICY "superadmin_delete_agents" ON public.whatsapp_agents
  FOR DELETE TO public
  USING (is_super_admin(auth.uid()));
```

## Resultado Esperado

Após a migração:

| Operação | Super Admin | Tenant |
|----------|-------------|--------|
| SELECT | Permitido (via `is_super_admin`) | Permitido (via `tenant_id`) |
| INSERT | Permitido (via `is_super_admin`) | Permitido (via `tenant_id`) |
| UPDATE | Permitido (via `is_super_admin`) | Permitido (via `tenant_id`) |
| DELETE | Permitido (via `is_super_admin`) | Permitido (via `tenant_id`) |

## Arquivos

Nenhum arquivo de código precisa ser alterado - o código atual (`SuperAdminAddAgentDialog.tsx`) já está correto. O problema é apenas nas políticas RLS do banco de dados.

