

## Imagens em Lista Vertical com Fundo Neutro

### O que sera feito

Trocar o layout de imagens sobrepostas (stack) por uma lista vertical onde cada screenshot aparece completamente visivel, uma abaixo da outra. Adicionar um elemento de fundo quadrado/retangular neutro (cinza claro, arredondado) atras das imagens, como na 4a imagem de referencia.

### Mudancas no arquivo `src/pages/HomePage.tsx` (linhas 440-463)

Substituir o container com posicionamento absoluto por um layout flex vertical com gap:

- **Fundo neutro**: Um `div` com `bg-gray-100 rounded-3xl` posicionado atras das imagens via `absolute`, cobrindo a area toda como moldura
- **Imagens em lista**: `flex flex-col gap-6` com cada imagem em tamanho `w-full`, bordas arredondadas e sombra suave
- Remover rotacoes e posicionamento absoluto das imagens
- Cada imagem tera leve sombra (`shadow-lg`) e borda (`border border-gray-200`) para separacao visual
- Container com `relative` para o fundo neutro ficar atras e `overflow-hidden` no fundo com `rounded-3xl`

### Estrutura final

```text
[div relative] (coluna direita)
  [div absolute bg-gray-100 rounded-3xl inset-0] (fundo neutro)
  [div relative z-10 flex flex-col gap-6 p-6]
    [img - Processos]
    [img - Kanban]
    [img - WhatsApp]
```

### Arquivo editado
- `src/pages/HomePage.tsx` - linhas 440-463

