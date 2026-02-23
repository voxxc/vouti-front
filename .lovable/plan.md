

## Corrigir busca de foto de perfil via Z-API

### Problema
A Z-API retorna `{ link: "null", errorMessage: "item-not-found" }` porque o telefone esta sendo enviado como `5545999445655` (com nono digito), mas a Z-API espera o formato `554599445655` (sem nono digito). Alem disso, a resposta da Z-API retorna `link: "null"` como string, nao como `null` real, entao a validacao atual falha.

### Solucao

**Arquivo:** `src/components/WhatsApp/components/ContactInfoPanel.tsx`

Duas correcoes na funcao `fetchProfilePicture`:

1. **Enviar o telefone na variante sem o 9o digito** usando `getPhoneVariant` (ja importado no arquivo). Se a variante existir, usar ela; senao, usar o numero original.

2. **Tratar `link: "null"` como string** -- a Z-API retorna a string literal `"null"` em vez de `null`. O codigo deve verificar `link && link !== "null"` antes de aceitar a URL.

### Detalhes tecnicos

Na funcao `fetchProfilePicture`:
- Calcular a variante do telefone: `const variant = getPhoneVariant(conversation.contactNumber)`
- Usar `variant || conversation.contactNumber` como o telefone enviado a Z-API
- Na validacao do resultado, checar `if (link && link !== "null")` em vez de apenas `if (link)`

Isso resolve ambos os problemas sem necessidade de alterar a edge function.
