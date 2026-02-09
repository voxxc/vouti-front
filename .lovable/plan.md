

# Plano: Corrigir Sistema de Agentes para Usar Credenciais Corretas

## Diagnóstico Confirmado

O sistema **original funcionava** porque usa a edge function `whatsapp-connect` com **variáveis de ambiente** (secrets):
- `Z_API_URL` 
- `Z_API_TOKEN`
- `Z_API_INSTANCE_ID`

O sistema de **agentes não funciona** porque:
1. A tabela `whatsapp_instances` está **VAZIA** (não há credenciais salvas)
2. Os valores digitados anteriormente estavam **INVERTIDOS** (Instance ID no lugar do Token e vice-versa)
3. O sistema novo não tem **fallback** para usar os secrets globais

## Solução: Fallback para Variáveis de Ambiente

Modificar a edge function `whatsapp-zapi-action` para usar as variáveis de ambiente como fallback quando não receber credenciais específicas do agente.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `whatsapp-zapi-action/index.ts` | Adicionar fallback para variáveis de ambiente |

### Lógica do Fallback

```text
Prioridade de credenciais:
┌────────────────────────────────────────────────────────────────┐
│ 1. Credenciais do Agente (zapi_instance_id + zapi_instance_token)
│    └─ Se fornecidas → usar diretamente
│
│ 2. Fallback: Variáveis de Ambiente (secrets globais)
│    └─ Z_API_URL → base da URL
│    └─ Z_API_TOKEN → Client-Token header
└────────────────────────────────────────────────────────────────┘
```

### Código da Correção

A edge function verificará se as credenciais foram fornecidas. Se não, usará os secrets globais:

```typescript
// Prioridade 1: Credenciais específicas do agente
if (zapi_instance_id && zapi_instance_token) {
  baseUrl = `https://api.z-api.io/instances/${zapi_instance_id}/token/${zapi_instance_token}`;
  if (zapi_client_token) {
    clientToken = zapi_client_token;
  }
} 
// Prioridade 2: Variáveis de ambiente (fallback)
else {
  const envUrl = Deno.env.get('Z_API_URL');
  const envToken = Deno.env.get('Z_API_TOKEN');
  
  if (envUrl && envToken) {
    baseUrl = envUrl.replace(/\/send-text\/?$/, '').replace(/\/$/, '');
    clientToken = envToken;
  } else {
    throw new Error('Missing Z-API credentials');
  }
}
```

## Benefícios

1. **Retrocompatibilidade**: O sistema continua funcionando com as credenciais globais existentes
2. **Flexibilidade**: Agentes podem ter suas próprias credenciais quando configurados
3. **Sem migração de dados**: Não precisa alterar dados no banco

## Próximos Passos Após Implementação

1. O QR Code vai funcionar imediatamente usando os secrets globais
2. Quando você configurar credenciais específicas para um agente, elas terão prioridade
3. Se quiser, pode depois remover as variáveis de ambiente globais quando todos os agentes tiverem suas próprias credenciais

