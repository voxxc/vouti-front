

## Corrigir erro "ON CONFLICT" no salvamento do Agente IA

### Problema

O codigo usa `.upsert(payload, { onConflict: 'agent_id' })`, mas o indice unico na coluna `agent_id` eh parcial (`WHERE agent_id IS NOT NULL`). O PostgreSQL nao aceita `ON CONFLICT` referenciando indices parciais — por isso o erro `42P10`.

### Solucao

Trocar o `upsert` por logica manual de verificacao no `handleSave`:

1. Primeiro, buscar se ja existe config para o `agent_id`
2. Se existir, fazer `UPDATE`
3. Se nao existir, fazer `INSERT`

### Mudanca no codigo

**Arquivo**: `src/components/WhatsApp/settings/WhatsAppAISettings.tsx`

No `handleSave`, substituir o bloco do `else` (quando `config.id` nao existe) por:

```text
// Em vez de upsert com onConflict (que falha com indice parcial):
// 1. Buscar config existente pelo agent_id
const { data: existing } = await supabase
  .from('whatsapp_ai_config')
  .select('id')
  .eq('agent_id', agentId)
  .maybeSingle();

if (existing) {
  // Update
  const result = await supabase
    .from('whatsapp_ai_config')
    .update(payload)
    .eq('id', existing.id);
  error = result.error;
  setConfig(prev => ({ ...prev, id: existing.id }));
} else {
  // Insert
  const result = await supabase
    .from('whatsapp_ai_config')
    .insert(payload)
    .select()
    .single();
  error = result.error;
  if (result.data) {
    setConfig(prev => ({ ...prev, id: result.data.id }));
  }
}
```

### Resultado esperado

- Salvar config do agente IA funciona sem erro
- Primeira vez: INSERT cria o registro
- Vezes seguintes: UPDATE atualiza o registro existente (via `config.id` ja carregado)
