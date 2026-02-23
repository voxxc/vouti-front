

## Diagnostico e Correcao: Falhas de Carregamento no Tenant Solvenza

### Problema identificado

O tenant Solvenza possui **21.772 andamentos** (8.506 nao lidos) em **311 processos**. Os logs mostram dezenas de erros `"canceling statement due to statement timeout"` e `"Timed out acquiring connection from connection pool"`, causando:

1. **"Erro ao carregar projetos"** - toast visivel no dashboard
2. **Central travando** - queries pesadas saturam o connection pool

### Causa raiz

Tres queries pesadas rodam simultaneamente ao abrir o dashboard/controladoria, saturando o pool de conexoes:

| Query | O que faz | Volume |
|---|---|---|
| `CentralControladoria.tsx` (badge) | LEFT JOIN 311 processos × 21.772 andamentos, filtra `lida=false` no JS | ~22k rows |
| `useAndamentosNaoLidosGlobal.ts` | Mesmo JOIN + dados de OAB | ~22k rows |
| `useProjectsOptimized.ts` + `DashboardLayout.tsx` | Queries normais que falham porque o pool esta esgotado | Vitimas colaterais |

O pool de conexoes do Supabase Free tier suporta ~20 conexoes. As queries de andamentos demoram tanto que bloqueiam as demais.

### Solucao em 2 partes

**Parte 1: Otimizacao de performance (banco + frontend)**

Criar 2 funcoes SQL + 1 indice composto para eliminar as queries pesadas:

**Migracao SQL:**
- `get_total_andamentos_nao_lidos(p_tenant_id)` - retorna 1 numero em vez de 22k rows
- `get_andamentos_nao_lidos_por_processo(p_tenant_id)` - retorna ~50 rows (processos com pendencias) em vez de 22k
- Indice composto `idx_andamentos_processo_lida_composite` em `(processo_oab_id) WHERE lida = false`

**`CentralControladoria.tsx`:**
- Substituir query pesada por `supabase.rpc('get_total_andamentos_nao_lidos', { p_tenant_id: tenantId })`
- Retorna 1 numero, executa em <10ms

**`useAndamentosNaoLidosGlobal.ts`:**
- Query 1: Buscar processos com OAB (sem join de andamentos) - ~311 rows leves
- Query 2: `supabase.rpc('get_andamentos_nao_lidos_por_processo', { p_tenant_id: tenantId })` - ~50 rows
- Merge em memoria por `processo_oab_id`
- Resultado: mesma funcionalidade, 99% menos dados transferidos

**Parte 2: Marcar todos os andamentos como lidos**

Usar a funcao `marcarTodosGlobalComoLidos` ja implementada, executando-a via SQL direto para o tenant Solvenza, limpando os 8.506 andamentos pendentes de uma vez.

### Impacto esperado

| Metrica | Antes | Depois |
|---|---|---|
| Rows para badge | ~22.000 | 1 |
| Rows para lista | ~22.000 | ~360 |
| Tempo de resposta | Timeout (>8s) | <200ms |
| Erro "carregar projetos" | Sim (pool esgotado) | Nao (pool livre) |

### Arquivos alterados

- **Migracao SQL**: 2 funcoes + 1 indice
- `src/components/Controladoria/CentralControladoria.tsx` - RPC para badge
- `src/hooks/useAndamentosNaoLidosGlobal.ts` - RPC + merge para lista

