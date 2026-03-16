

# Corrigir corte do badge "Popular" e adicionar abas de navegação no carrossel mobile

## Problemas identificados

1. O badge "Popular" usa `absolute -top-3` mas o `CarouselContent` tem `overflow-hidden`, cortando o topo dos cards.
2. Faltam abas flutuantes para navegar entre planos.

## Mudanças — `src/pages/HomePage.tsx`

### 1. Corrigir corte do badge "Popular"

Adicionar `overflow-visible` no `CarouselContent` e `pt-4` para dar espaço ao badge:

```tsx
<CarouselContent className="-ml-3 overflow-visible pt-4">
```

E no wrapper do carousel, adicionar `overflow-hidden` no container externo apenas no eixo X:

```tsx
<div className="overflow-x-clip">
  <Carousel ...>
```

### 2. Adicionar abas flutuantes acima do carrossel

Antes do `Carousel`, renderizar uma barra horizontal com os nomes dos planos como chips clicáveis. Ao clicar, o carrossel navega (`api.scrollTo(index)`). O chip ativo fica destacado:

```tsx
<div className="flex gap-2 justify-center mb-4 flex-wrap">
  {plans.map((plan, i) => (
    <button
      key={i}
      onClick={() => api?.scrollTo(i)}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm",
        i === current
          ? "bg-foreground text-background shadow-md scale-105"
          : "bg-muted text-muted-foreground"
      )}
    >
      {plan.name}
    </button>
  ))}
</div>
```

### 3. Remover dots (substituídos pelas abas)

Remover o bloco de dots indicators, já que as abas cumprem essa função.

Todas as mudanças dentro de `PlanCarouselMobile` em `HomePage.tsx`. ~20 linhas alteradas.

