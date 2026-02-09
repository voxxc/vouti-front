
## Plano: Inserir Mensagem Histórica do Lead 0026

### Contexto

A mensagem para o lead `5545999180026` foi enviada às 10:21 (antes da correção ser deployada). O código antigo tinha o campo `is_from_me` inválido, causando falha silenciosa no INSERT.

### Solução

Executar um INSERT manual via migração para adicionar essa mensagem ao histórico:

```sql
INSERT INTO whatsapp_messages (
  instance_name,
  message_id,
  from_number,
  to_number,
  message_text,
  direction,
  user_id,
  tenant_id,
  agent_id,
  created_at
) VALUES (
  'superadmin-5ee34df4-f07a-4c9b-a8ec-5a218ca812a9',
  'manual_recovery_' || gen_random_uuid(),
  '5545999180026',
  '5545999180026',
  'Olá, Laura Dama, Tudo bom ?

Sou do atendimento do Vouti. Vi que você acabou de conhecer nossa plataforma.

Antes de encaminhar para um especialista, queria entender um pouco da sua rotina: hoje você já utiliza alguma plataforma para gerenciar o dia a dia do seu escritório?',
  'outgoing',
  '8eda80fa-0319-4791-923e-551052282e62',
  NULL,
  '5ee34df4-f07a-4c9b-a8ec-5a218ca812a9',
  '2026-02-09 10:21:00.859+00'
);
```

### Resultado Esperado

1. A conversa com o lead `5545999180026` aparecerá imediatamente na Caixa de Entrada do Super Admin
2. A mensagem terá o timestamp correto (10:21)
3. Estará vinculada ao agente correto

### Novas Mensagens

A correção já está ativa. Qualquer nova mensagem enviada pelo bot será automaticamente salva no histórico e aparecerá no inbox.
