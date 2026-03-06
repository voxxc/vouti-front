

## Diagnóstico: Notificações não enviadas ao editar prazo

### Problema
No `EditarPrazoDialog.tsx`, ao salvar edições:
- Tags são atualizadas (delete antigas + insert novas) nas linhas 133-149
- Responsável é atualizado na linha 126
- **Nenhuma notificação é disparada** — não há chamada a `notifyDeadlineTagged` nem `notifyDeadlineAssigned`

A função `notifyDeadlineTagged` só é chamada no `CreateDeadlineDialog.tsx` (criação), nunca na edição.

### Solução
Adicionar no `handleSave` do `EditarPrazoDialog.tsx`, após atualizar tags e responsável:

1. **Novos usuários tagueados**: Comparar tags anteriores vs novas, notificar apenas os recém-adicionados via `notifyDeadlineTagged`
2. **Novo responsável**: Se o responsável mudou, notificar o novo via `notifyDeadlineAssigned`

### Alterações

**`src/components/Agenda/EditarPrazoDialog.tsx`**

- Importar `notifyDeadlineAssigned` e `notifyDeadlineTagged` de `@/utils/notificationHelpers`
- Guardar os IDs originais dos tagged users para comparação
- Após atualizar tags (linha ~149), calcular novos tagged users e chamar `notifyDeadlineTagged` para os recém-adicionados
- Após detectar troca de responsável (linha ~164), chamar `notifyDeadlineAssigned` para o novo responsável

