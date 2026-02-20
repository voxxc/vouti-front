

## Mover botoes de acao para ao lado do vencimento

### Problema

Os botoes "Detalhes" e o menu de 3 pontos estao com `ml-auto`, o que os empurra para a extremidade direita do card. O usuario quer que fiquem logo ao lado da coluna de vencimento.

### Mudanca

**`src/components/Financial/ParcelaCard.tsx`**

Remover o `ml-auto` do container dos botoes de acao para que fiquem no fluxo natural, lado a lado com as demais colunas.

| Antes | Depois |
|---|---|
| `<div className="flex items-center gap-1 ml-auto">` | `<div className="flex items-center gap-1">` |

Isso faz com que numero, status, valor, vencimento, detalhes e 3 pontos fiquem todos sequenciais no lado esquerdo do card.

