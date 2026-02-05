
# Corrigir Busca de Processos Sigilosos com Credenciais do Cofre

## Problema Identificado

O processo `0035150-55.2023.8.16.0021` está em **segredo de justiça** (`secrecy_level: 1`) e os andamentos não estão vindo mesmo com a credencial do Rodrigo cadastrada no cofre Judit.

**Causa raiz**: As Edge Functions de busca (`judit-buscar-processo-cnj` e `judit-buscar-detalhes-processo`) chamam a API Judit **sem passar o campo `credential.customer_key`**, então a API usa o crawler público que não tem acesso aos dados sigilosos.

**Evidência dos logs**:
```
[Judit Import CNJ] Payload: {"search":{"search_type":"lawsuit_cnj","search_key":"00351505520238160021","on_demand":true}}
```

Note que o payload **não inclui** `credential: { customer_key: "rodrigoprojudi" }`.

---

## Solução

Modificar as Edge Functions para:
1. Verificar se existe credencial cadastrada para o tenant do processo
2. Se existir, incluir o `customer_key` no payload da requisição
3. Priorizar credenciais do tribunal correto (ex: TJPR para processos do TJPR)

---

## Alteracoes Tecnicas

### Arquivo 1: `supabase/functions/judit-buscar-processo-cnj/index.ts`

Adicionar busca de credenciais e inclusao no payload:

```typescript
// Antes de chamar a API (linha ~44)

// Buscar credencial do tenant para o tribunal
let customerKey: string | null = null;

if (tenantId) {
  // Extrair sigla do tribunal do CNJ (posicoes 16-17 = codigo do tribunal)
  // Ex: 00351505520238160021 -> 16 = TJ do estado 16 (PR)
  const tribunalCodigo = numeroLimpo.substring(13, 16);
  
  // Buscar credenciais do tenant
  const { data: credenciais } = await supabase
    .from('credenciais_judit')
    .select('customer_key, system_name')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');
  
  if (credenciais && credenciais.length > 0) {
    // Priorizar credencial do tribunal correspondente (se houver match)
    // Fallback para primeira credencial disponivel
    customerKey = credenciais[0].customer_key;
    console.log('[Judit Import CNJ] Usando credencial:', customerKey);
  }
}

// Payload com credencial (se disponivel)
const requestPayload = {
  search: {
    search_type: 'lawsuit_cnj',
    search_key: numeroLimpo,
    on_demand: true
  },
  ...(customerKey && { credential: { customer_key: customerKey } })
};
```

### Arquivo 2: `supabase/functions/judit-buscar-detalhes-processo/index.ts`

Aplicar a mesma logica para incluir `customer_key` quando existir credencial do tenant.

---

## Fluxo Apos Correcao

```text
Importar processo sigiloso (CNJ TJPR)
                |
                v
Buscar credenciais do tenant para TJPR
                |
        [Encontrou]
                |
                v
Incluir { credential: { customer_key: "rodrigoprojudi" } } no payload
                |
                v
API Judit usa crawler autenticado com credenciais do PROJUDI
                |
                v
Retorna dados completos (andamentos, partes, etc.)
                |
                v
Processo importado com todos os andamentos
```

---

## Resultado Esperado

1. Processos sigilosos com credenciais cadastradas receberao os andamentos completos
2. Processos publicos continuarao funcionando normalmente
3. O sistema selecionara automaticamente a credencial do tenant
4. Logs indicarao quando credenciais sao utilizadas

---

## Testes Necessarios

Apos implementacao:
1. Deletar o processo `0035150-55.2023.8.16.0021` e reimporta-lo
2. Verificar nos logs se o `customer_key` esta sendo enviado
3. Confirmar que os andamentos sao retornados e inseridos
