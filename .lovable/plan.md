

# Correção: Layout quebrado + Conversas desatualizadas

## Problema 1: Layout desalinhado (mensagens cortadas)

O ChatPanel tem `className="flex-1 flex flex-col"` mas **não tem `min-w-0 overflow-hidden`**. Em flexbox, sem `min-w-0`, o item não encolhe abaixo do tamanho do conteúdo. Quando o ContactInfoPanel abre ao lado, o ChatPanel não reduz sua largura — o conteúdo vaza para fora da tela, cortando as mensagens verdes (outgoing).

**Correção:** Adicionar `min-w-0 overflow-hidden` ao div raiz do ChatPanel.

## Problema 2: Conversas misturadas / preview desatualizado

O sistema de sinais via Realtime funciona, mas depende 100% de os sinais serem emitidos corretamente pelo webhook. Se um sinal falha, a UI fica parada até dar refresh. O usuário nota que "com polling era melhor".

**Correção:** Adicionar um polling leve (a cada 30 segundos) como **fallback** ao sistema de sinais. Não substitui os sinais — complementa como rede de segurança. Isso garante que mesmo se um sinal se perder, a lista de conversas e o preview se atualizem.

## Arquivos alterados

### 1. `src/components/WhatsApp/components/ChatPanel.tsx`
- Linha 374: mudar de `flex-1 flex flex-col bg-background` para `flex-1 flex flex-col bg-background min-w-0 overflow-hidden`

### 2. `src/hooks/useWhatsAppSync.ts`
- Adicionar polling de fallback (30s) que chama `onConversationUpdate` periodicamente
- O polling é leve — apenas recarrega a lista de conversas, não as mensagens do chat aberto

### 3. `src/components/WhatsApp/sections/WhatsAppInbox.tsx`
- Também adicionar `min-w-0` ao container flex do ConversationList para garantir que a lista de conversas não transborde

