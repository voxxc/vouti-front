

# Planos deslizáveis no mobile

## O que muda

No mobile (< 768px), trocar o grid empilhado de planos por um carrossel horizontal deslizável (swipeable). Os cards ficam "flutuantes" com sombra e o usuário arrasta lateralmente para ver cada plano.

## Abordagem

Usar o componente `Carousel` (Embla) já existente no projeto (`src/components/ui/carousel.tsx`) — sem dependência nova.

## Mudanças — `src/pages/HomePage.tsx`

### 1. Importar componentes do Carousel

```tsx
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
```

### 2. Substituir o grid (linha 610) por lógica condicional

**Desktop** (≥768px): mantém o grid atual `grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`.

**Mobile** (<768px): envolve os cards num `<Carousel>` horizontal com snap por card:

```tsx
{isMobile ? (
  <Carousel opts={{ align: 'start', loop: false }} className="w-full">
    <CarouselContent className="-ml-3">
      {plans.map((plan, i) => (
        <CarouselItem key={i} className="pl-3 basis-[80%]">
          <div className="rounded-xl p-6 border shadow-lg bg-white ...">
            {/* conteúdo do card existente */}
          </div>
        </CarouselItem>
      ))}
    </CarouselContent>
  </Carousel>
) : (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
    {/* cards existentes */}
  </div>
)}
```

### 3. Estilo dos cards no carrossel

- `basis-[80%]` — cada card ocupa 80% da tela, revelando parte do próximo
- `shadow-lg` + `bg-white` — efeito flutuante
- Borda arredondada mantida (`rounded-xl`)

### 4. Indicador de dots (opcional, incluso)

Abaixo do carrossel, bolinhas indicando qual card está ativo, usando a API do Embla:

```tsx
<div className="flex justify-center gap-1.5 mt-4">
  {plans.map((_, i) => (
    <div key={i} className={cn("w-2 h-2 rounded-full transition-colors",
      i === current ? "bg-[#0a0a0a]" : "bg-gray-300"
    )} />
  ))}
</div>
```

Mudança em 1 arquivo, ~40 linhas. Sem dependências novas.

