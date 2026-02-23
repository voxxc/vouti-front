

## Corrigir "Todas as Conversas" para exibir contatos salvos

### Problema
O componente `WhatsAppAllConversations` nao consulta a tabela `whatsapp_contacts` para resolver nomes salvos. Alem disso, agrupa as conversas por `telefone + agent_id`, duplicando o mesmo contato quando atendido por agentes diferentes.

### Solucao

**Arquivo:** `src/components/WhatsApp/sections/WhatsAppAllConversations.tsx`

#### 1. Buscar contatos salvos
Na funcao `loadConversations`, adicionar uma query paralela a `whatsapp_contacts` (igual ao Inbox faz):

```typescript
const [messagesResult, contactsResult] = await Promise.all([
  query,
  supabase
    .from("whatsapp_contacts")
    .select("phone, name")
    .eq("tenant_id", tenantId)
]);
```

Criar um mapa de nomes:
```typescript
const contactNameMap = new Map<string, string>();
contactsResult.data?.forEach(c => {
  contactNameMap.set(normalizePhone(c.phone), c.name);
  contactNameMap.set(c.phone, c.name);
});
```

#### 2. Agrupar por telefone (sem agent_id)
Mudar a chave de agrupamento de `${number}-${agent_id}` para apenas o telefone normalizado. O badge do agente continua sendo exibido (usando o agente da mensagem mais recente).

#### 3. Usar nome salvo no contactName
Ao criar a entrada da conversa, usar o nome do mapa de contatos:
```typescript
contactName: contactNameMap.get(normalizedNumber) || normalizedNumber,
```

#### 4. Importar utilitarios de telefone
Importar `normalizePhone` e `getPhoneVariant` de `@/utils/phoneUtils` (ja usado no Inbox).

### Resultado
- Contatos salvos por qualquer atendente aparecerao com o nome correto na lista
- Cada contato aparece uma unica vez (sem duplicatas por agente)
- O badge do agente mostra quem atendeu por ultimo
- Admin e todos os atendentes verao os mesmos contatos

### Detalhes tecnicos

Alteracoes concentradas na funcao `loadConversations` do arquivo `WhatsAppAllConversations.tsx`:
- Adicionar import de `normalizePhone` do `@/utils/phoneUtils`
- Adicionar query a `whatsapp_contacts` em paralelo com a query de mensagens
- Trocar a chave do Map de `${number}-${agent_id}` para `normalizePhone(number)`
- Usar `contactNameMap` para resolver nomes no campo `contactName`
