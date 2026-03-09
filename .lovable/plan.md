
# Redesign Mobile: Controladoria - Cards Limpos e Legíveis

## Problemas Identificados

Após análise do código e contexto visual:

1. **Cards muito compactos** — `ProcessoCard` (OABTab.tsx) e `GeralProcessoCard` (GeralTab.tsx) têm padding mínimo (`p-3`), CNJ truncado/quebrado com `break-all`, badges empilhando em linha causando overflow
2. **Informações invisíveis** — CNJ number cortado, partes truncadas demais (`truncate`), badges ficam fora da tela no mobile
3. **Hierarquia visual confusa** — CNJ (mais importante) tem mesmo peso que badges, falta destaque
4. **Drag handle desnecessário** — já escondido no mobile mas consome espaço no desktop, pode simplificar
5. **Ações apertadas** — botões Excluir + Detalhes ficam colados, texto "Detalhes" escondido no mobile

## Solução: Design Minimalista e Respirável

### Estrutura do Card Redesenhado

```
┌─────────────────────────────────────┐
│ [CNJ grande e destacado]            │
│ UF • Status badges                  │
│                                     │
│ Autor vs Réu (1 linha, truncado)   │
│ Tribunal (pequeno, secundário)     │
│                                     │
│ [Ícones de ação: 🗑️ 👁️]          │
└─────────────────────────────────────┘
```

**Mudanças:**
- CNJ: `text-base md:text-lg font-semibold` em linha própria
- UF badge + status: linha separada, `flex-wrap` controlado
- Partes: 1 linha, `text-sm`, `truncate` com tooltip no hover (desktop)
- Padding: `p-4 md:p-5` (mais ar)
- Ações: ícones apenas (`Trash2` + `Eye`), labels via tooltip, gap maior (`gap-2`)
- Remover drag handle completamente (ordenação manual raramente usada)

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `OABTab.tsx` | Redesign `ProcessoCard`: layout vertical clean, CNJ destacado, ações simplificadas |
| `GeralTab.tsx` | Redesign `GeralProcessoCard`: mesma estrutura, adicionar badge de OAB |
| `CNPJTab.tsx` | Redesign card inline (`renderProcessoCard`): mesmo padrão visual |
| `ProcessoOABCard.tsx` | Simplificar mobile: CNJ maior, badges wrapping, botões compactos |

### OABTab.tsx — ProcessoCard redesign

- Remover `Draggable` wrapper (manter `Droppable` no `InstanciaSection` para permitir expansão futura se necessário)
- Card: `p-4 hover:shadow-md` (mais padding, sombra no hover)
- Layout: `flex flex-col gap-3`
- **Linha 1**: CNJ `text-base md:text-lg font-semibold font-mono` sem truncate
- **Linha 2**: badges (UF extraído, monitoramento, novos andamentos, compartilhado) com `flex-wrap gap-1.5`
- **Linha 3**: Partes `text-sm text-muted-foreground truncate` com tooltip (desktop)
- **Linha 4**: Tribunal + ações (justify-between)

### GeralTab.tsx — GeralProcessoCard redesign

- Mesma estrutura do `ProcessoCard` acima
- Adicionar badge com OAB number/nome (`processo.oabs_cadastradas.oab_numero`) em linha 2

### CNPJTab.tsx — renderProcessoCard

- Estrutura similar: CNJ destacado, badges wrapping, partes em 1 linha

### ProcessoOABCard.tsx (usado na busca OAB)

- Mobile: CNJ `text-base`, botões `size="icon"` com tooltips em vez de texto

## Impacto

- Números CNJ sempre visíveis completos
- Cards respiram melhor (mais espaço)
- Hierarquia visual clara (CNJ > status > partes > tribunal)
- Ações consistentes (ícones + tooltip)
- Zero impacto funcional (apenas visual)
