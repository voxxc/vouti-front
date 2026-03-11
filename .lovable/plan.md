

## Diagnóstico: Prazo "APRESENTAR EMBARGOS À EXECUÇÃO" da Diuza

Encontrei o prazo no banco de dados:
- **ID**: `3f57c526-12e0-4862-89b7-16257e5934de`
- **Título**: APRESENTAR EMBARGOS À EXECUÇÃO
- **Cliente**: DIUZA MARA BORGES
- **Status**: `completed = true`
- **Problema**: O campo `concluido_por` está **NULL**

Wesley (`51d47f3b`) não é o advogado responsável (é o Alan `158daf46`), não é o criador, e não está marcado (tagged). Como `concluido_por` está NULL, ele não aparece nos concluídos para o Wesley por nenhum dos critérios do filtro.

Há também o prazo "EMBARGOS À MONITÓRIA" (`aefb9e4a`) da Diuza com o mesmo problema (completed=true, concluido_por=NULL).

### Correções

**1. Correção de dados (SQL migration)**
Atualizar os deadlines da Diuza que estão concluídos mas com `concluido_por` NULL, atribuindo o Wesley como quem concluiu.

**2. Correção de código (`AgendaContent.tsx`)**
Na atualização local do estado após conclusão (linha 759-763), o `completedByUserId` não é setado, fazendo o prazo sumir da lista imediatamente após conclusão até o próximo reload. Corrigir para incluir `completedByUserId: user?.id`.

### Detalhes técnicos

```sql
UPDATE deadlines 
SET concluido_por = '51d47f3b-fbe6-4811-9817-a45040c1bdee'
WHERE id IN ('3f57c526-12e0-4862-89b7-16257e5934de', 'aefb9e4a-3831-4cda-a245-1c8b64cdc490')
AND completed = true AND concluido_por IS NULL;
```

```typescript
// Linha 759-763 do AgendaContent.tsx
setDeadlines(deadlines.map(d =>
  d.id === confirmCompleteDeadlineId
    ? { ...d, completed: true, updatedAt: new Date(), completedByUserId: user?.id }
    : d
));
```

