

## Corrigir botao "Detalhes" invisivel na aba Geral

### Diagnostico

Comparando os dois prints:
- **Print 1 (OAB 92124/PR)**: Cards com botoes (lixeira + Detalhes) visiveis no lado direito -- funciona corretamente
- **Print 2 (Geral)**: A area direita dos cards esta vazia, o botao "Detalhes" nao aparece

O problema esta na div externa do card que tem `overflow-hidden`. Quando o texto das partes e longo (ex: nomes extensos de empresas), o conteudo empurra o botao para fora e o `overflow-hidden` o esconde completamente.

### Solucao

**Arquivo: `src/components/Controladoria/OABTabGeral.tsx`**

Ajustar o layout do `ProcessoCardGeral` (linhas 78-114):

1. Remover `overflow-hidden` da div flex externa (linha 78) -- isso corta o botao
2. Manter `overflow-hidden` apenas na div interna de conteudo (linha 79) -- isso trunca o texto corretamente
3. O `truncate` no texto das partes ja garante que o texto longo nao estoure

```
Antes (linha 78):
<div className="flex items-center gap-3 w-full overflow-hidden pr-2">

Depois:
<div className="flex items-center gap-3 w-full pr-2">
```

A div interna (linha 79) ja tem `overflow-hidden` e `min-w-0`, que e suficiente para conter o texto. A div externa nao precisa de `overflow-hidden` pois o botao precisa ser renderizado fora da area de texto.

### Arquivo modificado

| Arquivo | Acao |
|---|---|
| `src/components/Controladoria/OABTabGeral.tsx` | Remover `overflow-hidden` da div externa do card |

