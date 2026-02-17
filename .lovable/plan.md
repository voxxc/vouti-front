

## Abas de Grupos WhatsApp na Caixa de Entrada

### O que sera feito

Adicionar uma area entre o campo de busca e a lista de conversas, contendo:
1. Um botao "Buscar Grupos" que chama a edge function `whatsapp-list-groups`
2. Apos buscar, exibir os grupos encontrados como botoes redondos (avatares com icone de grupo) em uma linha horizontal com scroll
3. Ao clicar em um grupo, ele e selecionado como conversa ativa (usando o ID do grupo como `contactNumber`), permitindo enviar e receber mensagens
4. Os grupos ficam salvos no state local para nao precisar buscar novamente a cada navegacao

### Detalhes tecnicos

**Arquivo: `ConversationList.tsx`**
- Adicionar props novas: `groups` (lista de grupos), `onFetchGroups` (callback para buscar), `isLoadingGroups` (estado de carregamento)
- Entre o campo de busca e a lista de conversas, renderizar uma secao horizontal:
  - Se nao ha grupos carregados: exibir um botao compacto "Buscar Grupos" com icone `Users`
  - Se ha grupos: exibir botoes redondos (avatares) em uma linha horizontal com scroll, cada um mostrando a primeira letra do nome do grupo e um tooltip com o nome completo
  - Clicar em um grupo chama `onSelectConversation` com os dados do grupo formatados como `WhatsAppConversation`
- O grupo selecionado tera borda destacada (estilo ativo)

**Arquivo: `WhatsAppInbox.tsx`**
- Adicionar estados: `groups` (array de `{id, name}`), `isLoadingGroups` (boolean)
- Criar funcao `handleFetchGroups` que chama `supabase.functions.invoke("whatsapp-list-groups", { body: { agentId: myAgentId } })`
- Ao receber resultado, salvar em `groups`
- Passar `groups`, `onFetchGroups`, `isLoadingGroups` como props para `ConversationList`
- Ao selecionar um grupo, tratar como conversa normal -- o `contactNumber` sera o ID do grupo (ex: `120363...@g.us`), e o sistema ja suporta envio para IDs de grupo via `whatsapp-send-message`

### Layout visual da secao de grupos

```text
+-----------------------------------+
| [Buscar conversa...]              |  <- campo de busca existente
+-----------------------------------+
| [Buscar Grupos]  (O)(O)(O)(O) >>> |  <- botao + avatares redondos com scroll horizontal
+-----------------------------------+
| Conversa 1                        |
| Conversa 2                        |  <- lista de conversas existente
| ...                               |
+-----------------------------------+
```

- Cada `(O)` e um avatar redondo com o icone `Users` e a inicial do grupo
- Hover mostra tooltip com nome completo
- Grupo selecionado tem borda verde/primary
- Se ha muitos grupos, a linha tem scroll horizontal

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `ConversationList.tsx` | Adicionar secao de grupos entre busca e lista; aceitar props de grupos |
| `WhatsAppInbox.tsx` | Gerenciar estado de grupos, chamar edge function, passar props |

