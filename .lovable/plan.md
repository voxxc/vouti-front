

# Correção: Notificações de menções em comentários não são criadas

## Causa raiz

A tabela `notifications` tem um **CHECK constraint** (`notifications_type_check`) que restringe os valores permitidos no campo `type`. O valor `'comment_mention'` **não está na lista permitida**:

```text
Valores permitidos atualmente:
  project_update, task_moved, task_created, mention, comment_added,
  andamento_processo, deadline_assigned, deadline_tagged, project_added

Valores ausentes (usados no código):
  comment_mention, conversation_transferred
```

Quando `useCommentMentions` tenta inserir uma notificação com `type: 'comment_mention'`, o Postgres rejeita o INSERT com erro de constraint, mas o código captura o erro silenciosamente (apenas `console.error`), então o `comment_mentions` é salvo mas a notificação nunca é criada.

Confirmado nos dados: existem 2 registros recentes em `comment_mentions` (17:55 e 17:58) mas zero notificações `comment_mention`.

## Correção

### 1. Migração SQL — Atualizar CHECK constraint

Remover o constraint antigo e recriar com todos os tipos usados no código:

```sql
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'project_update', 'task_moved', 'task_created', 'mention',
    'comment_added', 'andamento_processo', 'deadline_assigned',
    'deadline_tagged', 'project_added', 'comment_mention',
    'conversation_transferred'
  ]));
```

### 2. Nenhuma alteração de código necessária

O código já está correto — `useCommentMentions` insere com `type: 'comment_mention'` e `NotificationCenter` já trata o ícone. Basta liberar o constraint no banco.

