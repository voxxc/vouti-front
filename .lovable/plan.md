

## Plano: Incluir campos de conclusão no mapeamento do AgendaContent

### Problema
O `AgendaContent.tsx` tem sua própria função `fetchDeadlinesAsync` (independente do `useAgendaData`) que NÃO mapeia os campos de conclusão: `comentarioConclusao`, `concluidoEm`, `completedByName`, `completedByAvatar`, `deadlineCategory`, `deadlineNumber`. Por isso, ao clicar num prazo concluído na Agenda, a aba "Conclusão" sempre mostra vazio.

### Correção

**Arquivo**: `src/components/Agenda/AgendaContent.tsx` (~linha 508-511)

Adicionar os campos faltantes no mapeamento dentro de `fetchDeadlinesAsync`, logo após `createdByAvatar` (linha 510):

```ts
completedByName: deadline.concluido_por ? creatorMap[deadline.concluido_por]?.full_name : undefined,
completedByAvatar: deadline.concluido_por ? creatorMap[deadline.concluido_por]?.avatar_url || undefined : undefined,
comentarioConclusao: deadline.comentario_conclusao || undefined,
concluidoEm: deadline.concluido_em ? safeParseTimestamp(deadline.concluido_em) : undefined,
deadlineCategory: deadline.deadline_category || undefined,
deadlineNumber: (deadline as any).deadline_number || undefined,
```

Também garantir que o `creatorMap` inclua os user_ids de `concluido_por` (verificar se já busca esses perfis — se não, adicionar os IDs de `concluido_por` ao batch de perfis).

### Arquivo a editar
- `src/components/Agenda/AgendaContent.tsx`

