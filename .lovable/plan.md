
# Corrigir Contagem de Protocolos Concluídos no Dashboard

## Problema Identificado

O 3º card do Dashboard (Protocolos) não está contando corretamente os **protocolos concluídos**. A causa raiz é:

1. **Etapas** podem ter status `pendente`, `em_andamento` ou `concluido`
2. **Protocolos** têm status separado, mas nunca é atualizado automaticamente quando todas as etapas são concluídas
3. No banco de dados: todos os 44 protocolos têm status `em_andamento`
4. A query do Dashboard filtra por `p.status === 'concluido'` no protocolo, resultando em 0 protocolos concluídos

## Solução

Modificar a query do Dashboard para considerar um protocolo como "concluído" de duas formas:

1. **Status explícito**: `status === 'concluido'` (quando o usuário marca manualmente)
2. **100% das etapas concluídas**: Quando um protocolo tem etapas e todas estão com `status === 'concluido'`

Isso refletirá melhor a realidade operacional, onde protocolos são considerados concluídos quando todas as etapas foram finalizadas.

## Alterações Técnicas

### Arquivo: src/components/Dashboard/Metrics/AdminMetrics.tsx

Modificar a query de protocolos para incluir as etapas e calcular a conclusão:

```tsx
// Antes (linhas 37-38)
protocolosRes = await supabase
  .from('project_protocolos')
  .select('id, status, data_previsao')

// Depois
protocolosRes = await supabase
  .from('project_protocolos')
  .select(`
    id, 
    status, 
    data_previsao,
    etapas:project_protocolo_etapas(id, status)
  `)
```

Modificar a lógica de contagem de protocolos concluídos:

```tsx
// Antes (linha 53)
const protocolosConcluidos = protocolos.filter(p => p.status === 'concluido').length;

// Depois - considera concluído se:
// 1. Status explícito é 'concluido' OU
// 2. Tem etapas E todas estão concluídas
const protocolosConcluidos = protocolos.filter(p => {
  if (p.status === 'concluido') return true;
  const etapas = p.etapas || [];
  if (etapas.length === 0) return false;
  return etapas.every(e => e.status === 'concluido');
}).length;
```

Atualizar a lógica de protocolos atrasados para também considerar a mesma definição de "concluído":

```tsx
// Antes (linhas 49-52)
const protocolosAtrasados = protocolos.filter(p => {
  if (!p.data_previsao) return false;
  return new Date(p.data_previsao) < new Date() && p.status !== 'concluido';
}).length;

// Depois
const protocolosAtrasados = protocolos.filter(p => {
  if (!p.data_previsao) return false;
  const isConcluido = p.status === 'concluido' || 
    ((p.etapas?.length || 0) > 0 && p.etapas.every(e => e.status === 'concluido'));
  return new Date(p.data_previsao) < new Date() && !isConcluido;
}).length;
```

## Resultado Esperado

1. O card de Protocolos mostrará corretamente quantos protocolos foram concluídos (seja por status explícito ou por ter 100% das etapas concluídas)
2. Protocolos atrasados não contarão os que já foram concluídos pelas etapas
3. O visual das mini-barras no card refletirá a realidade operacional

## Arquivo a Editar

- `src/components/Dashboard/Metrics/AdminMetrics.tsx`
