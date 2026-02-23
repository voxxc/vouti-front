

## Plano: Corrigir build errors e simplificar `useOABs.ts`

### O que muda

Concordo com sua analise. Sao 3 correções:

1. **`carregarDetalhes` e `consultarDetalhesRequest`**: Remover a chamada a Edge Function. O "Ver Detalhes" nao precisa buscar dados na Judit — os andamentos ja foram carregados na sincronizacao inicial e novos chegam via monitoramento + sincronizacao do super-admin. Essas duas funcoes podem ser removidas ou simplificadas para apenas abrir o drawer sem chamar API.

2. **`carregarDetalhesLote`** (no `useOABs`): Mesma logica — remover `getUser()` + `getTenantIdForUser()` e usar `user` e `tenantId` que ja existem no escopo do hook (linhas 75-76).

3. **`toggleMonitoramento`**: Este precisa continuar funcionando. A correção e simples — adicionar `const { user } = useAuth()` e `const { tenantId } = useTenantId()` no topo do `useProcessosOAB` e remover as 2 linhas manuais (518-519).

### Alteracoes detalhadas

**Arquivo**: `src/hooks/useOABs.ts`

**No hook `useOABs` (linha 70)**:
- `carregarDetalhesLote` (linhas 296-297): Remover `getUser()` + `getTenantIdForUser()`, usar `user` e `tenantId` do escopo (ja existem linhas 75-76)

**No hook `useProcessosOAB` (linha 343)**:
- Adicionar `const { user } = useAuth()` e `const { tenantId } = useTenantId()` logo apos linha 347
- `carregarDetalhes` (linhas 447-487): Remover a chamada a Edge Function. Simplificar para apenas retornar sem chamar API (o drawer ja mostra andamentos do banco)
- `consultarDetalhesRequest` (linhas 567-602): Remover a chamada a Edge Function. Mesma razao — dados ja estao no banco
- `toggleMonitoramento` (linhas 517-519): Remover `getUser()` + `getTenantIdForUser()`, usar `user` e `tenantId` do contexto

### Resultado

- 4 erros de build resolvidos
- Toggle de monitoramento continua funcionando normalmente
- "Ver Detalhes" abre sem chamar Edge Function desnecessaria
- Carregamento em lote usa contexto cached

