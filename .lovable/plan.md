

## Tornar os 3 Prints Visiveis no Mobile

### Problema

O container das imagens tem a classe `hidden lg:block`, ou seja, fica completamente oculto em telas menores que 1024px.

### O que sera feito

Remover o `hidden lg:block` e adaptar o layout para funcionar bem em mobile e desktop:

**Arquivo: `src/pages/HomePage.tsx`**

- **Linha 405**: Mudar o grid para empilhar no mobile -- texto em cima, imagens embaixo. Ja funciona assim com `grid-cols-1 lg:grid-cols-2`, entao basta tornar as imagens visiveis.
- **Linha 425**: Trocar `hidden lg:block` por apenas `relative`, removendo o ocultamento. As imagens passarao a aparecer abaixo do texto em mobile.
- Reduzir o padding interno do container de imagens no mobile: `p-4 lg:p-8`
- Reduzir a sobreposicao no mobile: `-mt-6 lg:-mt-10`
- Desativar as animacoes de flutuacao no mobile para evitar problemas de performance e overflow, aplicando as classes de animacao apenas em `lg:` ou via media query

**Arquivo: `src/index.css`**

- Envolver as animacoes showcase-float em `@media (min-width: 1024px)` para que no mobile as imagens fiquem estaticas (sem flutuacao), evitando overflow horizontal causado pelas rotacoes

### Resultado

No mobile, os 3 prints aparecerao empilhados abaixo da lista de features, com sobreposicao leve e sem animacao. No desktop, tudo continua como esta hoje com flutuacao e rotacao.

