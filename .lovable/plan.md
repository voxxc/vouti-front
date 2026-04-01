

## Plano: Auto-refresh do Planejador ao salvar alterações de prazo

### Problema
Ao editar um prazo no Planejador (ex: mudar a data), o `onSuccess` do `EditarPrazoDialog` só invalida `planejador-prazos` (lista de prazos relacionados dentro do detalhe). Não invalida `planejador-tasks`, que é a query que alimenta as colunas do Kanban. Por isso o card não muda de coluna automaticamente.

### Solução

**Arquivo**: `src/components/Planejador/PlanejadorTaskDetail.tsx` (linha 960-962)

Adicionar invalidação de `planejador-tasks` no `onSuccess` do `EditarPrazoDialog`:

```tsx
onSuccess={() => {
  queryClient.invalidateQueries({ queryKey: ['planejador-prazos'] });
  queryClient.invalidateQueries({ queryKey: ['planejador-tasks'] });
}}
```

Isso faz o Kanban re-buscar os dados automaticamente após salvar, movendo o card para a coluna correta sem precisar de botão de refresh.

