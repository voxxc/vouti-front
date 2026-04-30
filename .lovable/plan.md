
# Correção: Indicadores e Relatórios de Reuniões

## Problema Identificado

As páginas de **Métricas** (`/reunioes/metricas`) e **Relatórios** (`/reunioes/relatorios`) não funcionam por dois motivos:

1. **`useReuniaoMetrics`** (hook principal de ambas as páginas) **não filtra por `tenant_id`** — viola a regra de isolamento multi-tenant. Isso causa queries sem retorno ou erros de RLS.

2. **`checkIfUserIsAdmin`** (usada no hook acima) **não filtra por `tenant_id`** — pode retornar `false` incorretamente, fazendo a página de Relatórios mostrar "Acesso Negado".

## Correções

### 1. Atualizar `useReuniaoMetrics` para receber e usar `tenant_id`

- Adicionar `tenant_id` como parâmetro (via `useTenantId` internamente ou recebido)
- Aplicar `.eq('tenant_id', tenantId)` em todas as queries de `reunioes`
- Aguardar `tenantId` estar disponível antes de executar queries (guard clause)

### 2. Corrigir verificação de admin com tenant

- Substituir `checkIfUserIsAdmin` por verificação via `useAuth().userRole` (já disponível no contexto) ou usar `checkIfUserIsAdminOrController` com `tenantId`
- Garantir que a página de Relatórios use a role do tenant correto

### 3. Ajustar `MinhasMetricasReuniao`

- Já usa `useTenantId` para leads, mas o hook `useReuniaoMetrics` que ele chama não passa o tenant — corrigir essa conexão

### Arquivos a editar

- `src/hooks/useReuniaoMetrics.ts` — adicionar `tenant_id` filtering e corrigir admin check
- `src/pages/ReuniaoRelatorios.tsx` — usar `userRole` do AuthContext ao invés de depender do hook para admin check
- `src/components/Reunioes/MinhasMetricasReuniao.tsx` — passar tenant_id para o hook se necessário
