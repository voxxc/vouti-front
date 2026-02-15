

## Imagens em Cascata com Sobreposicao Parcial e Fundo Neutro

### O que sera feito

Trocar o layout de lista vertical (gap entre imagens) por um layout em cascata onde cada imagem sobrepoe parcialmente a anterior, como indicado na referencia. A 2a imagem comeca na margem inferior da 1a (sobreposicao leve), e a 3a sobrepoe um pouco a 2a. Adicionar um fundo neutro cinza arredondado atras de tudo.

### Mudancas no arquivo `src/pages/HomePage.tsx` (linhas 440-460)

Substituir o `flex flex-col gap-6` por um container com posicionamento relativo e margens negativas para criar sobreposicao:

- **Fundo neutro**: Manter o `div` com `bg-gray-100 rounded-3xl` absoluto atras das imagens (como na 4a imagem de referencia)
- **Imagem 1 (Processos)**: Posicao normal, `relative z-10`
- **Imagem 2 (Kanban)**: `relative z-20` com `margin-top: -40px` (sobe e sobrepoe levemente a 1a)
- **Imagem 3 (WhatsApp)**: `relative z-30` com `margin-top: -40px` (sobe e sobrepoe levemente a 2a)
- Cada imagem com `shadow-lg`, `rounded-xl`, `border border-gray-200`

### Estrutura final

```text
[div relative] (coluna direita)
  [div absolute inset-0 bg-gray-100 rounded-3xl -m-4] (fundo neutro)
  [div relative z-10 flex flex-col p-8]
    [img Processos - relative z-10]
    [img Kanban - relative z-20, mt-[-40px]]
    [img WhatsApp - relative z-30, mt-[-40px]]
```

A sobreposicao de ~40px faz com que cada imagem cubra apenas a parte inferior da anterior, deixando a maior parte do conteudo visivel. O z-index crescente garante que a imagem de baixo fica por cima da anterior.

### Arquivo editado
- `src/pages/HomePage.tsx` - linhas 440-460

