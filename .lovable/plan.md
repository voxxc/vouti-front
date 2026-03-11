

## Corrigir prazos concluídos que somem da lista

### Problema identificado

Quando um usuário não-admin conclui um prazo, o prazo desaparece da seção "Concluídos" se esse usuário não é o **advogado responsável** nem está **marcado** (tagged) no prazo.

O filtro atual em `getCompletedDeadlines` (linha 543-547 do `AgendaContent.tsx`):
```typescript
if (!isAdmin) {
  completed = completed.filter(d => 
    d.advogadoResponsavel?.userId === user?.id ||
    d.taggedUsers?.some(t => t.userId === user?.id)
  );
}
```

Não considera quem **criou** o prazo (`user_id`) nem quem **concluiu** (`concluido_por`).

### Solução

1. **`src/types/agenda.ts`** — Adicionar campos `createdByUserId` e `completedByUserId` ao tipo `Deadline`.

2. **`src/components/Agenda/AgendaContent.tsx`** — No mapeamento dos deadlines (linha ~412), incluir `createdByUserId: deadline.user_id` e `completedByUserId: deadline.concluido_por`.

3. **`src/components/Agenda/AgendaContent.tsx`** — No `getCompletedDeadlines`, expandir o filtro para non-admins incluindo criador e quem concluiu:
```typescript
if (!isAdmin) {
  completed = completed.filter(d => 
    d.advogadoResponsavel?.userId === user?.id ||
    d.taggedUsers?.some(t => t.userId === user?.id) ||
    d.createdByUserId === user?.id ||
    d.completedByUserId === user?.id
  );
}
```

4. **Mesma lógica** para o filtro de admin com `completedFilterUserId` (linhas 548-552).

