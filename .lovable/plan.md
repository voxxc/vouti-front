

## Corrigir area de scroll da aba Geral para exibir cards completos

### Diagnostico

O print mostra que os cards estao cortados na parte inferior -- os botoes do lado direito ficam invisiveis. A causa e a diferenca de abordagem de scroll entre as abas:

- **Abas individuais (OABTab.tsx, funciona)**: Usa `<div className="flex-1 overflow-y-auto pr-4" style={{ minHeight: '300px' }}>` -- se adapta automaticamente ao espaco disponivel
- **Aba Geral (OABTabGeral.tsx, quebrada)**: Usa `<ScrollArea className="h-[calc(100vh-380px)]">` -- altura fixa calculada que nao considera o layout real da pagina (metricas, tabs, etc.), cortando o conteudo

### Solucao

Substituir o `ScrollArea` com altura fixa por um `div` com `flex-1 overflow-y-auto`, identico ao que as abas individuais usam. Para isso, o container pai tambem precisa usar `flex flex-col` com altura adequada.

**Arquivo: `src/components/Controladoria/OABTabGeral.tsx`**

1. Trocar o wrapper de `<div className="space-y-4">` para `<div className="flex flex-col space-y-4 h-[calc(100vh-380px)]">` -- define o container como flex column
2. Substituir `<ScrollArea className="h-[calc(100vh-380px)]">` por `<div className="flex-1 overflow-y-auto pr-4" style={{ minHeight: '300px' }}>` -- mesma abordagem do OABTab.tsx
3. Remover import de `ScrollArea` se nao for mais usado no arquivo

Resultado: a area de processos vai ocupar o espaco restante disponivel e permitir scroll interno, exatamente como nas abas individuais.

### Arquivo modificado

| Arquivo | Acao |
|---|---|
| `src/components/Controladoria/OABTabGeral.tsx` | Substituir ScrollArea por div flex-1 overflow-y-auto, igual OABTab.tsx |

