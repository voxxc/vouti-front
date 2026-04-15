

## Plano: Garantir envio de `customer_key` em todas as funções de request CNJ

### Problema
As funções `judit-buscar-processo` e `vouti-gerar-resumo` fazem POST para `/requests` da Judit **sem** incluir `credential.customer_key`, mesmo quando o tenant tem credenciais ativas no cofre. Isso causa `LAWSUIT_NOT_FOUND` para processos sigilosos ou de tribunais que exigem login.

### Alterações

**1. `supabase/functions/judit-buscar-processo/index.ts`**
- Receber `tenantId` no body (ou buscar do processo)
- Buscar credenciais ativas em `credenciais_judit` para o tenant
- Extrair tribunal do CNJ e fazer matching de credencial (mesma lógica de `judit-buscar-processo-cnj`)
- Incluir `credential: { customer_key }` no payload do POST

**2. `supabase/functions/vouti-gerar-resumo/index.ts`**
- Usar o `tenant_id` do processo para buscar credenciais ativas
- Incluir `credential: { customer_key }` no payload do POST para `/requests`

**3. `supabase/functions/judit-carregar-detalhes-lote/index.ts`** (verificar e corrigir se necessário)

### Padrão a replicar
Mesmo bloco já usado em `judit-buscar-processo-cnj` e `judit-buscar-detalhes-processo`:
```typescript
// Buscar credencial do tenant
const { data: credenciais } = await supabase
  .from('credenciais_judit')
  .select('customer_key, system_name')
  .eq('tenant_id', tenantId)
  .eq('status', 'active');

// Incluir no payload
const payload = {
  search: { search_type: 'lawsuit_cnj', search_key: numeroCnj },
  ...(customerKey && { credential: { customer_key: customerKey } })
};
```

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `supabase/functions/judit-buscar-processo/index.ts` — adicionar credential |
| Editar | `supabase/functions/vouti-gerar-resumo/index.ts` — adicionar credential |
| Verificar | `supabase/functions/judit-carregar-detalhes-lote/index.ts` |

### Sem migration
Não precisa de alteração no banco — apenas nas Edge Functions.

