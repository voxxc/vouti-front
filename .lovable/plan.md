

## Prints Flutuantes e Remocao dos Botoes Extras

### O que sera feito

1. **Remover os dois botoes "Ver Modulos"** (linhas 411-426) que aparecem acima do titulo "Tudo que seu escritorio precisa."

2. **Tornar os prints "flutuantes"** adicionando efeito visual de flutuacao nas 3 imagens da secao:
   - Sombra mais pronunciada e difusa (`shadow-2xl`) para dar sensacao de elevacao
   - Leve rotacao alternada nas imagens (ex: -2deg, 1deg, -1deg) para quebrar a rigidez
   - Animacao CSS sutil de "float" (subir e descer levemente) com keyframes, cada imagem com delay diferente para parecerem independentes
   - Manter a sobreposicao parcial (`-mt-10`) e z-index crescente

### Mudancas

**Arquivo: `src/pages/HomePage.tsx`**

- **Linhas 411-426**: Remover o `div` com os dois botoes "Ver Modulos"
- **Linhas 440-460**: Atualizar as classes das imagens:
  - Adicionar `shadow-2xl` no lugar de `shadow-lg`
  - Adicionar leve rotacao via `style={{ transform: 'rotate(Xdeg)' }}`
  - Adicionar classes de animacao flutuante (`animate-float-1`, `animate-float-2`, `animate-float-3`)

**Arquivo: `src/index.css`**

- Adicionar keyframes `float` com variacao sutil de translateY (~6px)
- Criar 3 classes de animacao com delays diferentes para efeito organico

### Resultado

As imagens parecerao "soltas" flutuando sobre o fundo neutro cinza, com movimento sutil e continuo, cada uma em ritmo ligeiramente diferente.

