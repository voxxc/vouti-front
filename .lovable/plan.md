
# Plano: Registrar Mensagens Enviadas na Conversa

## Problema Identificado

As mensagens enviadas pela plataforma não estão aparecendo porque:

1. **Webhook não salva respostas**: Quando a IA ou automações enviam mensagens, elas não são salvas no banco
2. **Campo incorreto**: A Edge Function `whatsapp-send-message` usa `from_number` para mensagens outgoing, mas deveria usar o mesmo campo para manter consistência na conversa

## Solução

Salvar toda mensagem enviada no banco com:
- `from_number` = telefone do lead (para agrupar na mesma conversa)
- `direction` = 'outgoing' (para identificar que foi enviada)
- `is_from_me` = true

## Arquivos a Modificar

### 1. `supabase/functions/whatsapp-webhook/index.ts`

Adicionar função para salvar mensagens enviadas e chamá-la após cada envio:

| Local | Alteração |
|-------|-----------|
| Nova função | `saveOutgoingMessage(phone, message, tenant_id, instance_name)` |
| Linha ~193 | Após enviar resposta automática, salvar no banco |
| Linha ~286 | Após enviar resposta IA, salvar no banco |

### 2. `supabase/functions/whatsapp-send-message/index.ts`

Garantir que `from_number` seja o telefone do destinatário (lead) para agrupar corretamente:

| Local | Alteração |
|-------|-----------|
| Linha 75-81 | Já está correto (`from_number: phone`), apenas garantir que está salvando |

## Lógica de Salvamento

A nova função `saveOutgoingMessage`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  saveOutgoingMessage(phone, message, tenant_id, instance_name)              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INSERT INTO whatsapp_messages:                                             │
│                                                                             │
│  - from_number: phone (telefone do lead - para agrupar na conversa)         │
│  - message_text: message                                                    │
│  - direction: 'outgoing'                                                    │
│  - is_from_me: true                                                         │
│  - tenant_id: tenant_id                                                     │
│  - instance_name: instance_name                                             │
│  - message_id: 'out_' + timestamp (ID único)                                │
│  - message_type: 'text'                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Fluxo Atualizado

### Resposta por Automação (keyword)

```text
1. Mensagem recebida do lead
2. Salva mensagem (direction: 'received')
3. Processa automação → encontra keyword
4. Envia via Z-API
5. ✅ NOVO: Salva mensagem (direction: 'outgoing')  ← ADICIONAR
```

### Resposta por IA

```text
1. Mensagem recebida do lead
2. Salva mensagem (direction: 'received')
3. IA habilitada → chama whatsapp-ai-chat
4. Recebe resposta da IA
5. Envia via Z-API
6. ✅ NOVO: Salva mensagem (direction: 'outgoing')  ← ADICIONAR
```

## Código da Nova Função

```typescript
async function saveOutgoingMessage(
  phone: string,
  message: string,
  tenant_id: string | null,
  instance_name: string,
  user_id?: string
) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      from_number: phone,  // Mesmo número do lead para agrupar
      message_text: message,
      direction: 'outgoing',
      is_from_me: true,
      tenant_id: tenant_id,
      instance_name: instance_name,
      message_id: `out_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message_type: 'text',
      user_id: user_id || null,
      timestamp: new Date().toISOString(),
      is_read: true,  // Mensagens enviadas já estão "lidas"
    });

  if (error) {
    console.error('❌ Erro ao salvar mensagem enviada:', error);
  } else {
    console.log('✅ Mensagem enviada salva no histórico');
  }
}
```

## Resultado Visual

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Conversa com +55 45 9999-9999                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────┐                                           │
│  │ Olá, preciso de ajuda       │  ← Mensagem do lead (direction: received) │
│  └──────────────────────────────┘                                           │
│                                              ┌────────────────────────────┐ │
│                                              │ Olá! Sou a assistente     │ │
│                                              │ do escritório. Como       │ │
│                                              │ posso ajudar?             │ │ ← NOVA: Mensagem da IA
│                                              └────────────────────────────┘ │
│                                                (direction: outgoing)        │
│                                                                             │
│  ┌──────────────────────────────┐                                           │
│  │ Quero saber sobre processos │  ← Lead responde                          │
│  └──────────────────────────────┘                                           │
│                                              ┌────────────────────────────┐ │
│                                              │ Posso verificar...        │ │ ← NOVA: Resposta IA
│                                              └────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Técnico

### Alterações no `whatsapp-webhook/index.ts`

1. Adicionar função `saveOutgoingMessage` após linha 30
2. Após linha 193 (envio por automação), chamar `saveOutgoingMessage`
3. Após linha 293 (envio por IA), chamar `saveOutgoingMessage`

### Alterações no `whatsapp-send-message/index.ts`

1. O código atual já salva (linhas 107-115), mas precisa garantir que `user_id` não seja obrigatório (já que service role pode não ter)
2. Verificar se o erro no console está sendo ignorado corretamente
