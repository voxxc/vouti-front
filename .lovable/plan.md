

## Plano: Lightbox para imagens no chat do Planejador

### Problema
Ao clicar numa imagem no chat, ela abre em nova aba. O usuário quer que abra num overlay/modal na própria tela.

### Mudança

**Arquivo**: `src/components/Planejador/PlanejadorTaskChat.tsx`

1. Adicionar state `previewImage: string | null`
2. Trocar o `<a href target="_blank">` (linha 459) por um `<div onClick={() => setPreviewImage(url)} className="cursor-pointer">`
3. Adicionar modal de preview no final do componente (overlay fixo com fundo escuro, botão X para fechar, imagem centralizada com `max-h-[90vh]`), mesmo padrão já usado em `ReuniaoArquivos.tsx`

### Resultado
Imagens abrem em lightbox na própria tela, com clique no fundo ou no X para fechar.

