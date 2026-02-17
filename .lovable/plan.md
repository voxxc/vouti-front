

## Garantir unicidade e limpeza das configs de IA por agente

### Situacao atual

O banco possui registros orfaos/duplicados na tabela `whatsapp_ai_config`:
- Configs de tenant-level (`agent_id = NULL`) criadas antes do modelo per-agent
- Exemplo: tenant `d395b3a1` tem uma config sem `agent_id` (antiga do Daniel) **e** configs especificas por agente

A logica de save ja faz upsert corretamente, mas falta:
1. Limpar registros orfaos existentes
2. Ao salvar config de um agente especifico, remover qualquer config de tenant-level do mesmo tenant (que nao deveria mais existir)
3. Ao desabilitar a IA de um agente (`is_enabled = false`), deletar o registro ao inves de apenas marcar como desabilitado -- evitando acumulo de registros inuteis

### Mudancas

**1. Limpeza dos registros orfaos (migracao SQL)**

Deletar configs de tenant-level que ja possuem configs per-agent, pois nao tem mais utilidade:

```sql
DELETE FROM whatsapp_ai_config
WHERE agent_id IS NULL
  AND tenant_id IS NOT NULL;
```

Isso remove o registro orfao do tenant `d395b3a1` (e qualquer outro semelhante).

**2. `WhatsAppAISettings.tsx` - Limpar fallback ao salvar config de agente**

Ao salvar uma config para um agente especifico, deletar qualquer config de tenant-level (`agent_id IS NULL`) do mesmo tenant, garantindo que nao haja fallback indesejado:

```text
// No handleSave, apos salvar com sucesso e se agentId existir:
if (agentId && tenantId) {
  await supabase
    .from('whatsapp_ai_config')
    .delete()
    .eq('tenant_id', tenantId)
    .is('agent_id', null);
}
```

**3. `WhatsAppAISettings.tsx` - Deletar config ao desabilitar IA**

Quando o usuario desabilita a IA (`is_enabled = false`) e salva, ao inves de manter o registro com `is_enabled: false`, **deletar** o registro:

```text
// No handleSave, se is_enabled for false e config.id existir:
if (!config.is_enabled && config.id) {
  await supabase
    .from('whatsapp_ai_config')
    .delete()
    .eq('id', config.id);
  
  setConfig(prev => ({ ...prev, id: undefined }));
  // toast de confirmacao
  return;
}
```

Isso garante que apenas agentes **ativamente configurados** tenham registros no banco.

### Arquivos a editar

1. **Migracao SQL** - deletar configs orfas de tenant-level
2. **`src/components/WhatsApp/settings/WhatsAppAISettings.tsx`** - adicionar limpeza no `handleSave`

### Resultado

- Cada agente tera no maximo **uma** config de IA
- Ao desabilitar IA, o registro e removido (nao sobra lixo)
- Ao salvar config per-agent, o fallback de tenant e limpo automaticamente
- Sem registros orfaos acumulando no banco

