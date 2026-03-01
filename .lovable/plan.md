

## Plano: Ordenação por data de movimentação mais recente

### 1. Migration SQL — Alterar RPC
Recriar `get_andamentos_nao_lidos_por_processo` para retornar `ultima_movimentacao` (MAX de `data_movimentacao`).

### 2. `src/hooks/useAndamentosNaoLidosGlobal.ts`
- Adicionar `ultima_movimentacao: string | null` ao tipo `ProcessoComNaoLidos`
- Guardar valor do RPC no mapa e propagar para cada processo
- Trocar `.sort()` de `b.andamentos_nao_lidos - a.andamentos_nao_lidos` para comparar por `ultima_movimentacao` descendente
- Mesmo ajuste no handler realtime (buscar `MAX(data_movimentacao)` junto com count)

### 3. `src/hooks/useAllProcessosOAB.ts`
- Adicionar `ultima_movimentacao?: string | null` ao `ProcessoOABComOAB`
- Propagar `ultima_movimentacao` do RPC para cada processo

### 4. `src/components/Controladoria/GeralTab.tsx`
- No `processosFiltrados`, quando `filtroUF === 'nao-lidos'`, ordenar por `ultima_movimentacao` descendente

### 5. `src/components/Controladoria/CentralAndamentosNaoLidos.tsx`
- Nenhuma mudança necessária — a ordenação já vem do hook

### Resultado esperado
- **Central**: processos com movimentação mais recente no topo (não mais por volume)
- **Geral com filtro "não lidos"**: mesma lógica — mais recente primeiro
- **Geral sem filtro**: mantém ordenação por `created_at`

