
# Plano: Corrigir Constraint UNIQUE na Tabela whatsapp_instances

## Problema Identificado

A tabela `whatsapp_instances` tem uma constraint **UNIQUE global** no campo `instance_name`:

```sql
CREATE UNIQUE INDEX whatsapp_instances_instance_name_key 
ON public.whatsapp_instances USING btree (instance_name)
```

Isso impede que:
- Diferentes tenants usem o mesmo `instance_name`
- O Super Admin use um `instance_name` já utilizado por algum tenant

### Erro nos Logs

```
duplicate key value violates unique constraint "whatsapp_instances_instance_name_key"
```

## Solução

Remover a constraint UNIQUE global e criar uma nova constraint que permita o mesmo `instance_name` em diferentes contextos.

### Opção Escolhida: UNIQUE por Combinação

Criar um índice UNIQUE parcial que considera:
- `instance_name` + `tenant_id` (para tenants)
- `instance_name` + `agent_id` quando `tenant_id IS NULL` (para Super Admin)

## Migração SQL

```sql
-- Remover a constraint antiga (global)
DROP INDEX IF EXISTS whatsapp_instances_instance_name_key;

-- Criar índice UNIQUE para instâncias com tenant
CREATE UNIQUE INDEX whatsapp_instances_tenant_instance_name_key 
ON public.whatsapp_instances (tenant_id, instance_name) 
WHERE tenant_id IS NOT NULL;

-- Criar índice UNIQUE para instâncias do Super Admin (tenant_id NULL)
CREATE UNIQUE INDEX whatsapp_instances_superadmin_instance_name_key 
ON public.whatsapp_instances (agent_id, instance_name) 
WHERE tenant_id IS NULL;
```

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Tenant A usa `instance_name = "XYZ"` | OK | OK |
| Tenant B usa `instance_name = "XYZ"` | ERRO | OK |
| Super Admin usa `instance_name = "XYZ"` (já usado por tenant) | ERRO | OK |
| Super Admin cria 2 instâncias com mesmo nome para agentes diferentes | ERRO | OK |
| Mesmo tenant cria 2 instâncias com mesmo nome | ERRO | ERRO (correto) |

## Arquivos

Nenhum arquivo de código precisa ser alterado. A mudança é apenas no esquema do banco de dados.

## Detalhes Técnicos

A migração usa índices parciais (`WHERE` clause) para separar as regras de unicidade:
1. Para registros com `tenant_id` definido: unicidade por `(tenant_id, instance_name)`
2. Para registros sem `tenant_id` (Super Admin): unicidade por `(agent_id, instance_name)`

Isso mantém a integridade dos dados enquanto permite flexibilidade entre diferentes contextos.
