## Confirmação de desvinculação de acordo

### Causa raiz
Hoje o botão de desvincular (icone "Unlink") em ambos os lados do vínculo aciona a remoção imediatamente, sem etapa de confirmação. Isso expõe o usuário a desvinculamentos acidentais por clique equivocado.

### Correção
Adicionar um `AlertDialog` de confirmação nativo (Radix, já disponível em `src/components/ui/alert-dialog.tsx`) antes de executar a mutation `unlink`.

### Arquivos afetados
1. `src/components/Planejador/AcordoLinkPicker.tsx` — desvinculação do lado do Planejador (card do Kanban → acordo).
2. `src/components/Project/PlanejadorTaskPicker.tsx` — desvinculação do lado do Projeto (dívida → tarefa do Planejador).

### Impacto

**UX / Telas:**
- O usuário clica no icone de desvincular → abre um modal de confirmação com título "Desvincular acordo?", descrição explicando que o histórico é preservado, e botões "Cancelar" / "Confirmar".
- O fluxo de vincular (link) continua sem confirmação, pois é uma ação aditiva e reversível.

**Dados:**
- Nenhuma migration necessária.
- O mutation `unlink` continua salvando no `_historico` antes de deletar (já implementado).
- Nenhum risco de dados órfãos.

**Riscos colaterais:**
- Nenhum. Apenas adiciona uma etapa de UI; a lógica de negócio permanece inalterada.

### Validação
- Testar desvinculação em ambos os pickers e confirmar que o modal aparece, o botão Cancelar fecha sem ação, e Confirmar executa a mutation.