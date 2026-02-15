

## Aumentar as imagens do showcase sem cortar

O problema atual e que as imagens ocupam apenas metade do grid (1 coluna de 2). Para aumenta-las sem cortar, a solucao e permitir que a coluna da imagem ocupe mais espaco no grid.

### Mudanca

**Arquivo**: `src/pages/HomePage.tsx`

- Alterar o grid de `grid-cols-2` (50/50) para um layout assimetrico onde a imagem ocupa mais espaco, usando `lg:grid-cols-5` com a imagem ocupando 3 colunas (`lg:col-span-3`) e o texto 2 colunas (`lg:col-span-2`).
- Isso faz a imagem ficar ~60% maior em relacao ao texto, sem corte e sem distorcao.

