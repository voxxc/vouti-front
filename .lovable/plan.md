
# Correção: Botões de Ação Cortados nos Cards de Processos

## Problema Identificado

O `ScrollArea` adicionado para scroll independente está cortando a lateral direita dos cards de processos, escondendo os botões "Excluir" e "Detalhes".

**Causa raiz**: O `Viewport` do Radix ScrollArea usa `overflow: scroll` internamente, mas não respeita o `pr-4` aplicado no container filho. O conteúdo está sendo cortado horizontalmente.

## Solução

Ajustar a estrutura do ScrollArea para garantir que o conteúdo interno tenha largura total visível:

1. Remover `pr-4` do container interno do ScrollArea
2. Adicionar `overflow-x-visible` ou usar `min-w-0` nos elementos flex
3. Garantir que o `ProcessoCard` não tenha conteúdo que ultrapasse os limites

## Alterações

### Arquivo: `src/components/Controladoria/OABTab.tsx`

**Mudança 1 - Container do ScrollArea (linha 631-633):**

```tsx
// ANTES:
<ScrollArea className="h-[calc(100vh-320px)]">
  <DragDropContext onDragEnd={handleDragEnd}>
    <div className="space-y-4 pr-4">

// DEPOIS:
<div className="h-[calc(100vh-320px)] overflow-y-auto overflow-x-hidden">
  <DragDropContext onDragEnd={handleDragEnd}>
    <div className="space-y-4">
```

**Explicacao**: Trocar o `ScrollArea` do Radix por um `div` nativo com `overflow-y-auto` resolve o problema de corte horizontal. O Radix ScrollArea é otimo para scrollbars customizados, mas pode causar problemas de largura em layouts flex complexos.

**Alternativa (se quiser manter ScrollArea):**

```tsx
<ScrollArea className="h-[calc(100vh-320px)] w-full">
  <DragDropContext onDragEnd={handleDragEnd}>
    <div className="space-y-4 w-full">
```

E ajustar o `ProcessoCard` para ter `min-w-0` no container flex:

```tsx
// Linha 168 do ProcessoCard:
<div className="flex items-center gap-3 min-w-0 w-full">
```

**Mudança 2 - ProcessoCard (linha 168):**

```tsx
// ANTES:
<div className="flex items-center gap-3">

// DEPOIS:
<div className="flex items-center gap-3 w-full">
```

**Mudança 3 - Actions no ProcessoCard (linha 241):**

```tsx
// ANTES:
<div className="flex items-center gap-1">

// DEPOIS:
<div className="flex items-center gap-1 shrink-0">
```

Adicionar `shrink-0` garante que os botoes de acao nunca encolham, permanecendo sempre visiveis.

---

## Resumo

| Local | Antes | Depois |
|-------|-------|--------|
| ScrollArea container | `pr-4` | Removido ou usar div nativo |
| ProcessoCard flex | `flex items-center gap-3` | `flex items-center gap-3 w-full` |
| Actions container | `flex items-center gap-1` | `flex items-center gap-1 shrink-0` |

## Resultado Esperado

- Botoes "Excluir" e "Detalhes" ficam visiveis na lateral direita
- Scroll vertical funciona normalmente
- Cards nao sao cortados horizontalmente
