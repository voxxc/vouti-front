

## Corrigir: IA respondendo por agentes que nao tem IA habilitada

### Problema

O sistema tem uma logica de fallback: se nao encontra uma configuracao de IA especifica para o agente, busca uma configuracao no nivel do tenant (onde `agent_id` e nulo). Como o Daniel tem uma config de IA habilitada no tenant, **todos os agentes sem config propria** (como a Laura) acabam usando essa config e respondendo com IA.

### Causa raiz

No webhook e no chat da IA, o codigo faz:

1. Busca config por `agent_id` -- Laura nao tem, retorna vazio
2. Fallback: busca config onde `agent_id IS NULL` e `tenant_id` bate -- encontra a config do Daniel
3. Config encontrada com `is_enabled: true` -- IA responde pela Laura

### Solucao

Quando a mensagem vem de um agente especifico (tem `agent_id`), **nao usar fallback para config do tenant**. O fallback so deve ser usado quando nao ha agente associado (mensagens sem `agent_id`).

### Mudancas

**1. `supabase/functions/whatsapp-webhook/index.ts` (funcao `handleAIResponse`)**

Alterar a logica nas linhas 394-408: so executar o fallback se `agent_id` for nulo/undefined.

```text
Antes:
  if (!aiConfig) {
    // busca fallback tenant (sempre)
  }

Depois:
  if (!aiConfig && !agent_id) {
    // busca fallback tenant (apenas se nao tem agente)
  }
```

**2. `supabase/functions/whatsapp-ai-chat/index.ts` (linhas 57-68)**

Mesma logica: so fazer fallback para config do tenant se `agent_id` nao foi informado.

```text
Antes:
  if (!aiConfig && !configError) {
    // busca fallback tenant (sempre)
  }

Depois:
  if (!aiConfig && !configError && !agent_id) {
    // busca fallback tenant (apenas se nao tem agente)
  }
```

### Arquivos a editar

1. `supabase/functions/whatsapp-webhook/index.ts` - condicionar fallback a ausencia de `agent_id`
2. `supabase/functions/whatsapp-ai-chat/index.ts` - mesma correcao

### Resultado

- Agentes **com** config de IA propria: usam sua config normalmente
- Agentes **sem** config de IA: IA **nao responde** (comportamento esperado)
- Mensagens **sem agente** vinculado: continuam usando fallback do tenant (se existir)

