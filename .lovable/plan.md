

# Plano: Corrigir Dado Corrompido no Banco e Salvar Corretamente

## Problema Identificado

O campo `zapi_token` no banco de dados contém a **URL COMPLETA** ao invés de apenas o token:

```text
Valor Atual (ERRADO):
┌──────────────────────────────────────────────────────────────────────┐
│ zapi_token: https://api.z-api.io/instances/.../token/F5DA387.../    │
└──────────────────────────────────────────────────────────────────────┘

Valor Esperado (CORRETO):
┌──────────────────────────────────────────────────────────────────────┐
│ zapi_token: F5DA3871D271E4965BD44484                                 │
└──────────────────────────────────────────────────────────────────────┘
```

Isso faz com que a Edge Function monte esta URL quebrada:
```
https://api.z-api.io/instances/{ID}/token/https://api.z-api.io/.../qr-code
```

## Causa Raiz

Você provavelmente colou a URL completa no campo "Instance Token" quando o sistema esperava apenas o token isolado.

## Solução

### 1. Limpar o Registro Corrompido no Banco

Executar SQL para corrigir o dado existente, extraindo apenas o token da URL:

```sql
UPDATE whatsapp_instances 
SET zapi_token = 'F5DA3871D271E4965BD44484'
WHERE id = 'b9417577-0019-4642-a2ee-1733233951e4';
```

### 2. Adicionar Validação no Frontend

Para evitar que isso aconteça novamente, adicionar validação que:
- Detecta se o usuário colou uma URL ao invés do token
- Extrai automaticamente o token da URL colada
- Mostra feedback visual quando detecta URL

**Arquivo:** `SuperAdminAgentConfigDrawer.tsx`

```typescript
// Função para extrair token de uma URL ou retornar o valor como está
const extractTokenFromValue = (value: string): string => {
  // Se parece ser uma URL, extrai o token
  const match = value.match(/\/token\/([A-F0-9]+)\/?/i);
  if (match) {
    return match[1];
  }
  // Caso contrário, retorna o valor limpo (sem espaços e barras finais)
  return value.trim().replace(/\/$/, '');
};

// No onChange do Instance Token:
onChange={(e) => {
  const extractedToken = extractTokenFromValue(e.target.value);
  setConfig(prev => ({ ...prev, zapi_instance_token: extractedToken }));
}}
```

### 3. Mesma Lógica para Instance ID

```typescript
// Função para extrair Instance ID de uma URL
const extractInstanceIdFromValue = (value: string): string => {
  const match = value.match(/\/instances\/([A-F0-9]+)\//i);
  if (match) {
    return match[1];
  }
  return value.trim().replace(/\/$/, '');
};
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `SuperAdminAgentConfigDrawer.tsx` | Adicionar extração automática de token/ID de URLs coladas |
| `AgentConfigDrawer.tsx` | Mesma lógica para tenants |

## Ação Imediata Necessária

Antes de testar novamente, é preciso corrigir o dado no banco. A correção do código vai evitar que isso aconteça novamente, mas o dado atual precisa ser limpo.

## Fluxo Após Correção

```text
Usuário cola URL completa no campo "Instance Token":
┌──────────────────────────────────────────────────────────────────┐
│ https://api.z-api.io/instances/ABC123/token/F5DA387.../send-text │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
Sistema extrai automaticamente:
┌──────────────────────────────────────────────────────────────────┐
│ zapi_instance_token: F5DA3871D271E4965BD44484                    │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
URL montada corretamente:
┌──────────────────────────────────────────────────────────────────┐
│ https://api.z-api.io/instances/ABC123/token/F5DA387.../qr-code   │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
QR Code gerado com sucesso!
```

## Resumo

1. **Corrigir dado no banco** - Limpar a URL armazenada incorretamente
2. **Adicionar validação inteligente** - Extrair token/ID de URLs coladas automaticamente
3. **Aplicar em ambos os drawers** - Super Admin e Tenants

