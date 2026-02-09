

# Plano: Corrigir Salvamento de Mensagens Enviadas Manualmente

## Problema Identificado

Nos logs da Edge Function:

```
Error saving message to DB: {
  code: "23502",
  message: 'null value in column "user_id" violates not-null constraint'
}
```

**A mensagem É enviada para o WhatsApp** (Z-API retorna sucesso), mas **NÃO é salva no banco** porque a coluna `user_id` é obrigatória (NOT NULL) e o código não está passando esse valor.

## Solução

Há duas opções:

| Opção | Descrição | Prós | Contras |
|-------|-----------|------|---------|
| **A. Alterar a tabela** | Tornar `user_id` nullable | Simples, rápido | Mensagens podem ficar sem autor |
| **B. Corrigir o código** | Extrair `user_id` do JWT e passar | Mantém integridade | Mais código |

**Recomendação:** Opção A (tornar `user_id` nullable) porque:
- Mensagens do webhook/bot não têm `user_id` associado
- O campo `direction` já indica se é do sistema ou usuário
- Evita erros em todos os fluxos

## Alterações

### 1. Migração SQL (Alterar tabela)

```sql
ALTER TABLE whatsapp_messages 
ALTER COLUMN user_id DROP NOT NULL;
```

### 2. Nenhuma alteração no código necessária

A Edge Function já tenta salvar com todos os campos corretos. Só falta permitir `user_id` nulo.

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  USUÁRIO ENVIA MENSAGEM                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Super Admin/Tenant clica "Enviar"                                      │
│   2. ChatPanel chama whatsapp-send-message                                  │
│   3. Edge Function envia via Z-API (OK ✅)                                  │
│   4. Edge Function salva no banco:                                          │
│      - from_number: telefone do lead                                        │
│      - direction: 'outgoing'                                                │
│      - tenant_id: NULL (Super Admin) ou tenant_id (Tenant)                  │
│      - user_id: NULL (agora permitido) ✅                                   │
│   5. Mensagem aparece na conversa! ✅                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

Após a migração:
- Mensagens enviadas manualmente serão salvas no banco
- A conversa atualizará em tempo real com suas mensagens
- O polling de 2 segundos mostrará as novas mensagens

