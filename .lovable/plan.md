
## Corrigir roteamento de mensagens quando contato existe em multiplos Kanbans

### Problema

O contato `5545988282387` existe no Kanban do Daniel E da Laura. O webhook busca o kanban entry mais recente por `updated_at`, que retorna Laura (atualizado em 17/02). Resultado: TODAS as mensagens desse contato vao para Laura, mesmo quando chegam pela instancia do Daniel.

```text
Fluxo atual (com bug):
  Mensagem chega na instancia do Daniel
    -> instance.agent_id = Daniel
    -> Busca kanban: ORDER BY updated_at DESC LIMIT 1
    -> Retorna Laura (updated_at mais recente)
    -> effectiveAgentId = Laura
    -> Mensagem salva com agent_id = Laura
    -> Daniel NAO ve a mensagem na sua Inbox
```

### Correcao

**Arquivo**: `supabase/functions/whatsapp-webhook/index.ts` (linhas 230-248)

Mudar a logica de resolucao do agente efetivo: **priorizar o kanban entry do proprio agente da instancia**. So redirecionar para outro agente se o contato NAO existir no kanban do agente da instancia.

```text
Fluxo corrigido:
  Mensagem chega na instancia do Daniel
    -> instance.agent_id = Daniel
    -> Busca kanban do DANIEL para esse telefone
    -> Se existe: effectiveAgentId = Daniel (mantém)
    -> Se NAO existe: busca kanban de QUALQUER agente (transferencia)
    -> effectiveAgentId = agente encontrado
```

### Detalhes tecnicos

Substituir a query unica (linhas 233-247) por duas queries em sequencia:

1. **Primeira query**: buscar kanban entry para o `instance.agent_id` + phone
2. **Se nao encontrar**: buscar qualquer kanban entry para phone + tenant (ORDER BY updated_at DESC) - este e o caso de transferencia

```typescript
// 1. Priorizar kanban do agente da instancia
const { data: ownKanban } = await supabase
  .from('whatsapp_conversation_kanban')
  .select('agent_id')
  .eq('phone', phone)
  .eq('tenant_id', effectiveTenantId)
  .eq('agent_id', effectiveAgentId)
  .limit(1)
  .maybeSingle();

if (ownKanban) {
  // Contato existe no kanban do agente da instancia - manter
  effectiveAgentId = ownKanban.agent_id;
} else {
  // Contato NAO esta no kanban deste agente - verificar transferencia
  const { data: otherKanban } = await supabase
    .from('whatsapp_conversation_kanban')
    .select('agent_id')
    .eq('phone', phone)
    .eq('tenant_id', effectiveTenantId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otherKanban?.agent_id) {
    console.log('Conversation routed: instance agent -> kanban agent');
    effectiveAgentId = otherKanban.agent_id;
  }
}
```

Isso garante que:
- Se o contato esta no kanban do Daniel E da Laura, a mensagem que chega na instancia do Daniel vai para o Daniel
- Se o contato foi transferido (existe APENAS no kanban da Laura mas nao do Daniel), ai sim redireciona para Laura
- Sem impacto em outros tenants ou no Super Admin
