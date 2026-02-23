

## Adicionar aba "Geral" na seção OABs da Controladoria

### O que muda

Uma nova aba chamada **"Geral"** sera adicionada antes de todas as abas de OABs individuais. Essa aba consolida todos os processos de todas as OABs cadastradas, sem duplicacoes (processos com o mesmo `numero_cnj` aparecem apenas uma vez). Tambem inclui uma barra de pesquisa para filtrar processos por CNJ, partes ou tribunal.

### Como funciona

- **Deduplicacao**: Processos com o mesmo `numero_cnj` que aparecem em multiplas OABs sao mostrados apenas uma vez, priorizando o registro com mais dados (detalhes carregados, monitoramento ativo).
- **Pesquisa**: Campo de busca filtra por numero CNJ, parte ativa, parte passiva ou tribunal.
- **Visualizacao**: Mesma estrutura de cards e agrupamento por instancia ja utilizada nas abas individuais.

### Alteracoes tecnicas

**1. Novo componente: `src/components/Controladoria/OABTabGeral.tsx`**

Componente que:
- Busca todos os processos do tenant via `processos_oab` (com join na `oabs_cadastradas` para pegar nome do advogado)
- Deduplica por `numero_cnj`, mantendo o registro mais completo
- Reutiliza os componentes `ProcessoCard` e `InstanciaSection` do `OABTab.tsx` (serao extraidos para um arquivo compartilhado ou importados)
- Inclui barra de pesquisa e os mesmos filtros de UF/monitorados/nao-lidos
- Abre o drawer de detalhes (`ProcessoOABDetalhes`) ao clicar em "Detalhes"

**2. Novo hook: `src/hooks/useProcessosGeral.ts`**

Hook dedicado que:
- Busca todos os processos do tenant (sem filtro de `oab_id`)
- Faz deduplicacao no JavaScript: agrupa por `numero_cnj`, seleciona o registro com `detalhes_carregados = true` ou `monitoramento_ativo = true` como prioritario
- Retorna a lista deduplicada com contagem de andamentos nao lidos
- Inclui real-time subscription para atualizacoes

```typescript
// Logica de deduplicacao
const deduplicar = (processos: ProcessoOAB[]): ProcessoOAB[] => {
  const mapa = new Map<string, ProcessoOAB>();
  processos.forEach(p => {
    const existente = mapa.get(p.numero_cnj);
    if (!existente || 
        (!existente.detalhes_carregados && p.detalhes_carregados) ||
        (!existente.monitoramento_ativo && p.monitoramento_ativo)) {
      mapa.set(p.numero_cnj, p);
    }
  });
  return Array.from(mapa.values());
};
```

**3. Modificacao: `src/components/Controladoria/OABManager.tsx`**

- Adicionar aba "Geral" com valor `"geral"` como primeira aba no `TabsList`
- Definir `activeTab` inicial como `"geral"` em vez de string vazia
- Adicionar `TabsContent` para `"geral"` renderizando o componente `OABTabGeral`

Trecho da mudanca no TabsList:
```
<TabsList>
  <TabsTrigger value="geral">
    Geral
    <Badge variant="secondary">{totalProcessosUnicos}</Badge>
  </TabsTrigger>
  {oabs.map((oab) => (
    <TabsTrigger key={oab.id} value={oab.id}>
      {oab.oab_numero}/{oab.oab_uf}
      ...
    </TabsTrigger>
  ))}
</TabsList>
```

### Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/hooks/useProcessosGeral.ts` | Criar -- hook para buscar todos os processos do tenant e deduplicar |
| `src/components/Controladoria/OABTabGeral.tsx` | Criar -- componente da aba Geral com lista deduplicada e pesquisa |
| `src/components/Controladoria/OABManager.tsx` | Modificar -- adicionar aba "Geral" antes das OABs individuais |

