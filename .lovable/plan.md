

## Problema: Mensagens do celular não aparecem na caixa de entrada

### Diagnóstico

O webhook recebe a mensagem normalmente (status 200), mas **descarta silenciosamente** quando o número vem no formato LID (identificador interno do WhatsApp) e não consegue resolver para um número real.

Evidência concreta: a mensagem de imagem das 13:53:29 gerou o warning `"Could not resolve LID"` e **não foi salva no banco** (query confirmou 0 registros após 13:53:00).

### Causa raiz

O Z-API está enviando `phone` no formato LID (ex: `34028340283@lid` ou números com 14+ dígitos que não começam com 55). A função `resolvePhoneFromLid` tenta 4 estratégias:

1. Extrair de `chatId` - falha se chatId também é LID
2. Extrair de `chatLid` - falha se chatLid não tem formato brasileiro
3. Extrair de `senderName` - raramente funciona
4. Buscar no banco por mensagens anteriores - falha se é primeira interação ou dados anteriores também usam LID

Quando todas falham, a mensagem é **silenciosamente descartada** (linha 197: `return;`).

### Solução

Expandir a resolução de LID com mais fontes de dados disponíveis no payload do Z-API e adicionar fallback para salvar a mensagem mesmo quando não consegue resolver completamente.

### Mudanças no código

**Arquivo**: `supabase/functions/whatsapp-webhook/index.ts`

| Mudança | Detalhe |
|---|---|
| Expandir `resolvePhoneFromLid` | Adicionar extração do campo `connectedPhone` (número do remetente quando `fromMe=true`), buscar pelo `chatName` na tabela de contatos, e tentar extrair número do `participantLid` |
| Fallback para `fromMe=true` | Quando a mensagem é `fromMe` e o LID não resolve, usar o `connectedPhone` como contexto e buscar o número de destino pelo `messageId` ou `chatName` no histórico |
| Salvar com LID como fallback | Em vez de descartar, salvar a mensagem com o LID como `from_number` temporário e marcar com um flag `needs_phone_resolution` para resolução posterior |
| Logging melhorado | Logar os campos disponíveis quando falha a resolução para diagnóstico |

### Implementação técnica

```typescript
// resolvePhoneFromLid melhorado
async function resolvePhoneFromLid(data: any, originalPhone: string): Promise<string | null> {
  // 1. chatId (existente)
  if (data.chatId && typeof data.chatId === 'string') {
    const chatPhone = data.chatId.replace(/@.*$/, '').replace(/\D/g, '');
    if (chatPhone.startsWith('55') && chatPhone.length >= 12 && chatPhone.length <= 13) {
      return chatPhone;
    }
  }

  // 2. chatLid (existente)
  if (data.chatLid && typeof data.chatLid === 'string') {
    const chatLidPhone = data.chatLid.replace(/@.*$/, '').replace(/\D/g, '');
    if (chatLidPhone.startsWith('55') && chatLidPhone.length >= 12 && chatLidPhone.length <= 13) {
      return chatLidPhone;
    }
  }

  // 3. NOVO: buscar por instanceId + chatName na tabela de contatos
  if (data.chatName && data.instanceId) {
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('name', data.chatName)
      .limit(1)
      .maybeSingle();
    if (contact?.phone) return normalizePhoneNumber(contact.phone);
  }

  // 4. NOVO: buscar por chatName no histórico de mensagens
  if (data.chatName) {
    const { data: match } = await supabase
      .from('whatsapp_messages')
      .select('from_number')
      .eq('instance_name', data.instanceId)
      .neq('from_number', '')
      .not('from_number', 'like', '%@lid%')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Buscar correlação pelo raw_data.chatName
    if (match && match.length > 0) {
      for (const m of match) {
        // Verificar se este from_number tem mensagens com o mesmo chatName
        const { data: check } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('from_number', m.from_number)
          .limit(1)
          .maybeSingle();
        if (check) return m.from_number;
      }
    }
  }

  // 5. Busca existente por LID no histórico
  const lidOriginal = originalPhone.includes('@') ? originalPhone : `${originalPhone}@lid`;
  const lidClean = originalPhone.replace(/@.*$/, '');
  
  const { data: match } = await supabase
    .from('whatsapp_messages')
    .select('from_number')
    .eq('direction', 'received')
    .or(`raw_data->>chatLid.eq.${lidOriginal},raw_data->>chatLid.eq.${lidClean},raw_data->>phone.eq.${lidClean}`)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (match?.from_number) return match.from_number;

  // 6. NOVO: Logging detalhado para diagnóstico
  console.warn('Could not resolve LID', JSON.stringify({
    originalPhone,
    chatId: data.chatId,
    chatLid: data.chatLid,
    chatName: data.chatName,
    fromMe: data.fromMe,
    instanceId: data.instanceId,
  }));
  
  return null;
}
```

**Fallback: não descartar mensagens não resolvidas**

Em vez de `return` silencioso quando LID não resolve, salvar com o LID como número temporário:

```typescript
// Linha 192-198 atual:
if (rawPhone && isLidNumber(rawPhone)) {
  const realPhone = await resolvePhoneFromLid(data, rawPhone);
  if (realPhone) {
    resolvedPhone = realPhone;
  } else {
    return; // ← PROBLEMA: descarta silenciosamente
  }
}

// Mudança proposta:
if (rawPhone && isLidNumber(rawPhone)) {
  const realPhone = await resolvePhoneFromLid(data, rawPhone);
  if (realPhone) {
    resolvedPhone = realPhone;
  } else {
    // Fallback: usar chatName como identificador temporário
    // para não perder a mensagem
    resolvedPhone = data.chatName 
      ? `lid_${data.chatName.replace(/[^a-zA-Z0-9]/g, '_')}` 
      : `lid_${rawPhone.replace(/@.*$/, '')}`;
    console.warn('Using fallback phone for unresolved LID:', resolvedPhone);
  }
}
```

### Resultado esperado

- Mensagens com LID serão resolvidas com mais fontes (chatName, contatos, histórico)
- Mensagens que não puderem ser resolvidas serão salvas com identificador temporário em vez de descartadas
- Log detalhado para diagnóstico de LIDs não resolvidos

