

# Fix: Mensagens enviadas não aparecem + Layout

## Diagnóstico

1. **Mensagens enviadas não aparecem**: O `loadAllMessages` carrega TODAS as 3432 mensagens da Laura em ordem ascendente (mais antiga → mais recente). São 4 páginas de requests. Se qualquer página falhar ou demorar, as mensagens mais recentes (incluindo as enviadas) ficam invisíveis. Além disso, renderizar 3432 elementos DOM causa lentidão.

2. **Layout**: O `scrollIntoView` dentro do Radix ScrollArea pode falhar com milhares de elementos, fazendo o auto-scroll não alcançar o final.

3. **CHANNEL_ERROR**: O console mostra `CHANNEL_ERROR` no Realtime, então os sinais de sync não estão chegando.

## Solução

### 1. Inverter a estratégia de carregamento

Em vez de carregar TODAS as mensagens (ascendente), carregar apenas as **últimas 200 mensagens** (descendente, depois inverter para exibição):

**`src/utils/whatsappMessageLoader.ts`**:
- Nova função `loadLatestMessages` que busca com `order("created_at", { ascending: false }).limit(200)`, depois inverte o array
- Mantém `loadAllMessages` para quem precisar, mas os componentes passam a usar `loadLatestMessages`

### 2. Atualizar os 4 componentes

- **`WhatsAppInbox.tsx`**: Trocar `loadAllMessages` por `loadLatestMessages`
- **`WhatsAppAllConversations.tsx`**: Idem
- **`WhatsAppLabelConversations.tsx`**: Idem
- **`SuperAdminWhatsAppInbox.tsx`**: Idem

### 3. Botão "Carregar mais" no ChatPanel

- Adicionar um botão no topo da área de mensagens para carregar mensagens mais antigas quando o usuário quiser
- Prop `onLoadMore` + `hasMoreMessages` no ChatPanel

### Resultado esperado

- Conversa da Laura abre instantaneamente com as últimas 200 mensagens
- Mensagens enviadas (outgoing) aparecem corretamente à direita
- Auto-scroll funciona sem problemas
- Botão para ver histórico mais antigo

