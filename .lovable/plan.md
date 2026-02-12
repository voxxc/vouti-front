

## Corrigir salvamento de configuracoes do Agente IA (problema real identificado)

### Problema raiz

Existe um indice unico antigo `whatsapp_ai_config_tenant_id_key` na coluna `tenant_id` sozinha. Isso impede que um mesmo tenant tenha mais de uma linha na tabela — mesmo com `agent_id` diferentes.

Quando o admin do tenant tenta salvar config para um agente especifico (ex: `tenant_id = X, agent_id = A`), a insercao falha porque ja existe uma linha com `tenant_id = X, agent_id = NULL` (config fallback do tenant).

Para o Super Admin, o mesmo problema ocorre: ja existe uma linha com `tenant_id = NULL, agent_id = NULL` (config global). Porem, PostgreSQL permite multiplos NULLs em unique constraints, entao o problema eh exclusivamente para tenants.

### Solucao

**1. Migracao SQL**: Remover o indice unico antigo `whatsapp_ai_config_tenant_id_key` que bloqueia multiplas configs por tenant.

```text
DROP INDEX IF EXISTS whatsapp_ai_config_tenant_id_key;
```

Os novos indices parciais ja criados (`idx_whatsapp_ai_config_agent_id` e `idx_whatsapp_ai_config_tenant_fallback`) garantem unicidade corretamente:
- Um unico config por `agent_id` (quando agent_id NOT NULL)
- Um unico config fallback por `tenant_id` (quando agent_id IS NULL e tenant_id NOT NULL)

**2. Corrigir handleSave para Super Admin**: Quando `isSuperAdmin` salva config de um agente, o `tenant_id` no payload deve ser `null`, mas o `onConflict: 'agent_id'` so funciona se `agent_id` nao for NULL. Se por algum motivo `agentId` for undefined, o upsert falha. Adicionar validacao.

### Arquivo afetado

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Remover indice `whatsapp_ai_config_tenant_id_key` |
| `src/components/WhatsApp/settings/WhatsAppAISettings.tsx` | Nenhuma mudanca necessaria (codigo ja esta correto apos fix anterior) |

### Resultado esperado

- Admin do tenant pode salvar config individual para cada agente
- Super Admin pode salvar config individual para cada agente
- Configs fallback (sem agent_id) continuam funcionando
- Nenhum erro de constraint violation ao salvar

