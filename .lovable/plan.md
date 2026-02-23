

## Corrigir timeout ao carregar processos na aba Geral

### Diagnostico

A query do `useProcessosGeral.ts` faz um `SELECT * FROM processos_oab` com LEFT JOIN em `processos_oab_andamentos` para TODOS os processos do tenant de uma vez. Com 311 processos e 22.668 andamentos (13.491 nao lidos), o banco estoura o timeout de statement.

As abas individuais de OAB funcionam porque cada uma carrega um subconjunto menor de processos.

### Solucao

Separar em duas queries leves em vez de uma query pesada com join:

1. **Query 1**: Buscar processos sem join (rapido)
2. **Query 2**: Contar andamentos nao lidos com agregacao no banco (um unico SELECT com GROUP BY)

### Alteracao: `src/hooks/useProcessosGeral.ts`

Substituir a query atual:

```typescript
// ANTES (causa timeout):
const { data, error } = await supabase
  .from('processos_oab')
  .select(`*, processos_oab_andamentos!left(id, lida)`)
  .eq('tenant_id', tid)
  .order('ordem_lista', { ascending: true });
```

Por duas queries separadas:

```typescript
// DEPOIS (rapido):
// Query 1: buscar processos sem join
const { data: processosData, error } = await supabase
  .from('processos_oab')
  .select('*')
  .eq('tenant_id', tid)
  .order('ordem_lista', { ascending: true });

if (error) throw error;

// Query 2: contar nao lidos por processo (agregacao leve)
const { data: naoLidosData } = await supabase
  .from('processos_oab_andamentos')
  .select('processo_oab_id')
  .eq('tenant_id', tid)
  .eq('lida', false);

// Montar mapa de contagens
const naoLidosMap = new Map<string, number>();
(naoLidosData || []).forEach((a: any) => {
  naoLidosMap.set(a.processo_oab_id, 
    (naoLidosMap.get(a.processo_oab_id) || 0) + 1);
});

// Combinar
const processosComContagem = (processosData || []).map((p: any) => ({
  ...p,
  andamentos_nao_lidos: naoLidosMap.get(p.id) || 0,
})) as ProcessoOAB[];

setProcessos(deduplicar(processosComContagem));
```

### Por que resolve

- A query de processos sem join e rapida (311 rows, sem expandir andamentos)
- A query de andamentos nao lidos filtra por `lida = false` (reduz de 22k para 13k rows) e retorna apenas o `processo_oab_id` (coluna unica, sem payload pesado)
- Nenhum join pesado no banco, evitando o timeout

### Arquivo modificado

| Arquivo | Acao |
|---|---|
| `src/hooks/useProcessosGeral.ts` | Modificar -- separar em duas queries leves |
