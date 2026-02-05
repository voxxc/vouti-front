

# Correção Completa: Andamentos Não Importados

## Problemas Identificados

Após investigação, identifiquei **3 problemas** que causam andamentos vazios:

### Problema 1: Fallback para `last_step` já implementado mas não testado
A correção para usar `last_step` em processos com `steps: []` já foi aplicada e deployada. Processos importados **antes** dessa correção precisam ser recarregados manualmente.

### Problema 2: Processos sem tenant_id na busca compartilhada
O webhook de monitoramento (`judit-webhook-oab`) mostra `Processos compartilhados: 0`, indicando que a query por `tenant_id` pode estar falhando quando o tenant_id não bate ou é null.

### Problema 3: Processos com `detalhes_carregados: true` mas 0 andamentos
Vários processos estão marcados como carregados mas não têm andamentos registrados. A API retornou dados, mas os andamentos não foram inseridos.

---

## Correções Técnicas

### Correção 1: Melhorar busca de processos compartilhados

**Arquivo:** `supabase/functions/judit-buscar-detalhes-processo/index.ts`

A busca atual:
```typescript
const { data: allSharedProcesses } = await supabase
  .from('processos_oab')
  .select('id')
  .eq('numero_cnj', numeroCnj)
  .eq('tenant_id', tenantId);
```

Se `tenantId` for `null` ou diferente, não encontra o processo. Adicionar fallback para buscar pelo `processoOabId` recebido:

```typescript
// Buscar processos compartilhados pelo tenant
let sharedProcessIds: string[] = [];

if (tenantId) {
  const { data: allSharedProcesses } = await supabase
    .from('processos_oab')
    .select('id')
    .eq('numero_cnj', numeroCnj)
    .eq('tenant_id', tenantId);
  
  sharedProcessIds = (allSharedProcesses || []).map(p => p.id);
}

// FALLBACK: Se não encontrou processos mas temos o ID original, usar ele
if (sharedProcessIds.length === 0 && processoOabId) {
  console.log('[Judit Detalhes] Fallback: usando processoOabId original');
  sharedProcessIds = [processoOabId];
}
```

---

### Correção 2: Mesma lógica no webhook

**Arquivo:** `supabase/functions/judit-webhook-oab/index.ts`

Aplicar a mesma correção de fallback para garantir que os webhooks também encontrem os processos mesmo quando a busca por tenant_id falha.

---

## Testes Necessários

1. **Login na aplicação** (você está atualmente em `/auth`)
2. **Navegar até um processo com 0 andamentos**
3. **Clicar em "Carregar Andamentos"**
4. **Verificar se os andamentos são inseridos**

---

## Resultado Esperado

- Processos com `last_step` terão ao menos 1 andamento (segredo de justiça)
- Processos públicos terão todos os andamentos do array `steps`
- O fallback por `processoOabId` garantirá que processos são sempre encontrados
- Webhooks de monitoramento também funcionarão corretamente

