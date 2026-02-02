
# Plano: Remover Notificações de Andamentos Processuais

## Objetivo
Remover as notificações automáticas sobre andamentos processuais para evitar poluição visual na aba de notificações. As notificações devem ser mantidas apenas para:
- Marcações (@menções)
- Comentários
- Prazos agendados
- Prazos que estão se encerrando

---

## Alterações Necessárias

### 1. Edge Function: judit-webhook-oab
**Arquivo:** `supabase/functions/judit-webhook-oab/index.ts`

Remover completamente o bloco de código (linhas 354-392) que cria notificações do tipo `andamento_processo` quando novos andamentos são recebidos via webhook.

O sistema continuará:
- Salvando os andamentos na tabela `processos_oab_andamentos`
- Atualizando o contador `andamentos_nao_lidos`
- Propagando para processos compartilhados

Apenas a notificação push para o usuário será removida.

---

### 2. Edge Function: escavador-webhook
**Arquivo:** `supabase/functions/escavador-webhook/index.ts`

Remover o bloco de código (linhas 64-82) que cria notificações do tipo `processo_movimentacao` para o advogado responsável.

---

### 3. Hook de Notificações
**Arquivo:** `src/hooks/useNotifications.ts`

Remover os tipos de notificação relacionados a andamentos processuais:
- `andamento_processo` (remover do tipo union)

Tipos que permanecem:
- `project_update`
- `task_moved`
- `task_created`
- `mention`
- `comment_added`
- `deadline_assigned`
- `deadline_tagged`
- `project_added`

---

### 4. Componente NotificationCenter
**Arquivo:** `src/components/Communication/NotificationCenter.tsx`

- Remover o ícone/case para `andamento_processo` na função `getNotificationIcon()`
- Remover a navegação condicional para `andamento_processo` no `handleNotificationClick()`
- Remover import do ícone `Scale` se não for mais utilizado

---

## Detalhes Técnicos

```text
Arquivos a modificar:
┌────────────────────────────────────────────────────┬─────────────────┐
│ Arquivo                                            │ Ação            │
├────────────────────────────────────────────────────┼─────────────────┤
│ supabase/functions/judit-webhook-oab/index.ts      │ Remover bloco   │
│ supabase/functions/escavador-webhook/index.ts      │ Remover bloco   │
│ src/hooks/useNotifications.ts                      │ Remover tipo    │
│ src/components/Communication/NotificationCenter.tsx│ Limpar código   │
└────────────────────────────────────────────────────┴─────────────────┘
```

---

## O que NÃO será afetado

- A Central de Controladoria continuará funcionando normalmente com o badge de andamentos não lidos
- Os andamentos continuarão sendo salvos no banco de dados
- A propagação para processos compartilhados continua funcionando
- O usuário ainda verá os andamentos não lidos dentro da aba de Controladoria
- As demais notificações (comentários, prazos, menções) permanecem inalteradas

---

## Resultado Esperado

Após a implementação:
1. Webhooks da Judit/Escavador continuam salvando andamentos
2. Nenhuma notificação será enviada para andamentos processuais
3. A aba de notificações ficará limpa, apenas com interações relevantes
4. O badge na Controladoria continua indicando andamentos não lidos
