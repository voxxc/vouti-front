
# Correção Visual da Controladoria - Aba OABs

## Problemas Identificados

Ao analisar o código, identifiquei dois problemas:

1. **Header/Filtros não ficam fixos**: Quando há muitos processos na lista, o usuário precisa rolar tudo junto (incluindo a toolbar da OAB e os filtros). O comportamento correto seria: toolbar e filtros ficam fixos no topo, e apenas a lista de processos (1a Instância, 2a Instância, etc.) tem scroll.

2. **Scroll interno não configurado**: O componente `OABTab` não tem uma área de scroll interna. Todo o conteúdo fica dentro do scroll geral do drawer, o que causa a perda da referência visual.

## Conceito Visual

```text
ATUAL (tudo rola junto):              PROPOSTO (header fixo + lista scrollável):
                                      
┌───────────────────────────┐         ┌───────────────────────────┐
│ OAB 92124/PR              │ ↑       │ OAB 92124/PR              │  FIXO
│ [Filtrar: Todos ▼]        │ │       │ [Filtrar: Todos ▼]        │  FIXO
│ ─────────────────────────── │       │ ───────────────────────────│
│ ▼ 1a Instância (12)       │ │       │ ▼ 1a Instância (12)       │ ↑
│   • Processo 1            │ │       │   • Processo 1            │ │
│   • Processo 2            │ │       │   • Processo 2            │ │
│   • Processo 3            │ S       │   • Processo 3            │ S
│   • Processo 4            │ C       │   • Processo 4            │ C
│   • Processo 5            │ R       │   • Processo 5            │ R
│ ▼ 2a Instância (5)        │ O       │ ▼ 2a Instância (5)        │ O
│   • Recurso 1             │ L       │   • Recurso 1             │ L
│   • Recurso 2             │ L       │   • Recurso 2             │ L
│   (cortado...)            │ ↓       │   • Recurso 3 (visível!)  │ ↓
└───────────────────────────┘         └───────────────────────────┘
```

## Alterações Necessárias

### Arquivo: `src/components/Controladoria/OABTab.tsx`

Reestruturar o componente para ter duas áreas distintas:

1. **Área Fixa (Header)**: Contém os filtros por UF/status
2. **Área Scrollável**: Contém o `DragDropContext` com as seções de instância

**Estrutura proposta:**

```tsx
return (
  <>
    {/* Área Fixa - Filtros */}
    <div className="sticky top-0 z-10 bg-background pb-3 border-b mb-4">
      {(ufsDisponiveis.length > 1 || compartilhadosCount > 0 || naoLidosCount > 0) && (
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filtroUF} onValueChange={setFiltroUF}>
            {/* ... conteúdo do select ... */}
          </Select>
          {filtroUF !== 'todos' && (
            <Badge variant="secondary">
              {processosFiltrados.length} processos
            </Badge>
          )}
        </div>
      )}
    </div>

    {/* Área Scrollável - Lista de Processos */}
    <ScrollArea className="h-[calc(100vh-350px)]">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-4 pr-4">
          <InstanciaSection titulo="1a Instância" ... />
          <InstanciaSection titulo="2a Instância" ... />
          <InstanciaSection titulo="Instância não identificada" ... />
        </div>
      </DragDropContext>
    </ScrollArea>

    {/* Drawer de Detalhes e Dialogs (sem alteração) */}
    <ProcessoOABDetalhes ... />
    <AlertDialog ... />
  </>
);
```

### Detalhes Técnicos

**Imports a adicionar:**
```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
```

**Altura do ScrollArea:**
- Usar `h-[calc(100vh-350px)]` para calcular a altura disponível
- O valor 350px considera: header do drawer (60px) + header da controladoria (80px) + cards de métricas (100px) + tabs (50px) + toolbar da OAB (60px)
- Pode ser ajustado para `flex-1` se o container pai tiver `flex flex-col` e `overflow-hidden`

**Sticky para Filtros:**
- Usar `sticky top-0 z-10 bg-background` para manter os filtros visíveis
- Adicionar `pb-3 border-b` para separação visual

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Controladoria/OABTab.tsx` | Adicionar `ScrollArea` envolvendo o `DragDropContext`, tornar filtros `sticky` |

## Resultado Esperado

- Filtros de UF/status permanecem visíveis no topo enquanto o usuário rola
- Lista de processos (1a Instância, 2a Instância) tem scroll independente
- Scrollbar visível para indicar que há mais conteúdo
- Melhor experiência de navegação com muitos processos
