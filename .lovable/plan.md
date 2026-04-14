

## Plano: Suporte a Ctrl+V de imagens no chat do Planejador

### Mudança

**Arquivo**: `src/components/Planejador/PlanejadorTaskChat.tsx`

1. Adicionar um handler `onPaste` no `<Input>` (ou no container do chat) que intercepta o evento `paste`
2. No handler, verificar se `e.clipboardData.files` contém imagens (`file.type.startsWith('image/')`)
3. Se sim, reutilizar a mesma lógica de upload já existente em `handleFileSelect`: upload para `planejador-chat-files`, obter URL pública, e chamar `sendMessage.mutate` com `messageType: 'image'`

### Detalhes técnicos

- Extrair a lógica de upload de imagem do `handleFileSelect` para uma função compartilhada `uploadImageFile(file: File)`
- O `onPaste` chama `uploadImageFile` para cada arquivo de imagem encontrado no clipboard
- Apenas imagens são processadas no paste; texto continua funcionando normalmente
- Nenhuma mudança de banco ou storage necessária — usa a mesma infraestrutura existente

### Arquivo a editar
- `src/components/Planejador/PlanejadorTaskChat.tsx`

