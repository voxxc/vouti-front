

## Alteracoes na HomePage

### 1. Aumentar o tamanho do computador em 100%

Remover o `max-w-2xl` da imagem do computador e adicionar `scale-150` ou `lg:scale-[2]` com `origin-right` para dobrar o tamanho, mantendo o overflow controlado. Alternativa mais simples: trocar `max-w-2xl` por `max-w-none` e adicionar `lg:scale-[1.5]` ou similar com ajuste de margens.

Abordagem escolhida: remover `max-w-2xl`, usar `max-w-none` e aplicar `lg:scale-150` com `origin-center` no container, alem de `overflow-hidden` na section para evitar scroll horizontal.

### 2. Adicionar linha divisoria antes da secao "Tudo que seu escritorio precisa"

Inserir um `<hr />` ou `<div>` com borda entre o final da hero section e o inicio da secao de features, usando classes como `border-t border-gray-200` dentro do container.

### Arquivos editados

- `src/pages/HomePage.tsx`
  - Linha 319: trocar `max-w-2xl` por `max-w-none lg:scale-150`
  - Linha 315: ajustar container com `overflow-hidden`
  - Linha 327: adicionar `<hr>` ou divisor antes/no inicio da secao features

