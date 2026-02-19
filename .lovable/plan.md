

## Corrigir scroll descendo sozinho no chat do CRM

### Causa

Na linha 118-120 do `ChatPanel.tsx`, existe um `useEffect` que rola ate o final **toda vez** que o array `messages` muda:

```text
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```

Como as mensagens sao recarregadas via polling a cada 2 segundos (no componente pai), o `messages` recebe uma nova referencia de array a cada poll, disparando o scroll repetidamente -- mesmo sem mensagens novas.

### Solucao

Guardar a quantidade de mensagens anterior e so fazer scroll automatico quando:
1. Novas mensagens chegaram (length aumentou)
2. Ou e a carga inicial (de 0 para N)

### Mudanca

**`src/components/WhatsApp/components/ChatPanel.tsx`**

- Adicionar um `useRef` para guardar o `messages.length` anterior
- No `useEffect`, comparar o length atual com o anterior
- So chamar `scrollIntoView` se `messages.length > prevLength`
- Atualizar o ref depois da comparacao

Codigo resultante (substituir linhas 118-120):

```text
const prevMessagesLengthRef = useRef(0);

useEffect(() => {
  if (messages.length > prevMessagesLengthRef.current) {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  prevMessagesLengthRef.current = messages.length;
}, [messages]);
```

Isso garante que o scroll so desce quando ha mensagens novas de verdade, e nao a cada ciclo de polling.

