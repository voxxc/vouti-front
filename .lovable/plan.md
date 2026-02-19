

## Corrigir roteamento de instancias no whatsapp-process-queue

### Contexto

O tenant /demorais tem 2 agentes (Daniel e Laura), cada um com sua propria instancia conectada. O bug atual e que mensagens `landing_leads` caem no branch generico que usa `.single()` e falha ao encontrar 2 instancias.

### Mudancas

**1. Atualizar agente Daniel** (dados):
- `UPDATE whatsapp_agents SET landing_page_source = 'vouti_landing' WHERE name = 'Daniel' AND tenant_id = (tenant do demorais)`

**2. Edge Function `whatsapp-process-queue/index.ts`**:
- Adicionar branch para `landing_leads` com `tenant_id`: buscar instancia do agente que tem `landing_page_source` configurado
- Branch generico (else): trocar `.single()` por `.limit(1).maybeSingle()` e incluir `agent_id` no select

**3. Reprocessar mensagens falhadas**:
- UPDATE das 13 mensagens falhadas de volta para `status = 'pending'` e `attempts = 0`

### Detalhes tecnicos

Novo branch entre `leads_captacao` e o `else`:

```text
} else if (msg.lead_source === 'landing_leads' && msg.tenant_id) {
  // Busca instancia do agente com landing_page_source configurado
  .select('..., agent_id, whatsapp_agents!inner(landing_page_source)')
  .eq('tenant_id', msg.tenant_id)
  .not('whatsapp_agents.landing_page_source', 'is', null)
  .limit(1).maybeSingle()
}
```

Branch else corrigido:
```text
} else {
  // Generico - inclui agent_id e usa .limit(1).maybeSingle()
  .select('..., agent_id')
  .eq('tenant_id', msg.tenant_id)
  .limit(1).maybeSingle()
}
```

Assim, cada agente resolve para SUA instancia, sem conflito entre Daniel e Laura.

