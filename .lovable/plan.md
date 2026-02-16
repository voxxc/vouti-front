

## Ativar Flutuacao dos Prints no Mobile

### Problema atual

As animacoes de flutuacao (`animate-showcase-float`) estao desativadas no mobile porque estao dentro de `@media (min-width: 1024px)`. Isso foi feito para evitar overflow horizontal causado pelas rotacoes.

### Solucao

Reativar as animacoes em todos os tamanhos de tela, mas prevenir o overflow adicionando `overflow-hidden` no container das imagens no mobile.

### Mudancas

**Arquivo: `src/index.css`**

- Remover o `@media (min-width: 1024px)` que envolve as classes `.animate-showcase-float-1/2/3`, tornando-as ativas em qualquer viewport

**Arquivo: `src/pages/HomePage.tsx`**

- Adicionar `overflow-hidden` no container pai das imagens para evitar scroll horizontal causado pelas rotacoes no mobile

### Resultado

Os 3 prints flutuarao suavemente tanto no mobile quanto no desktop, sem causar overflow horizontal.

