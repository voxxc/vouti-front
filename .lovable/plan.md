

## Plano: Adicionar opção "Cumprir Etapa" no dialog de Conclusão do Prazo

### Objetivo
Quando o prazo está vinculado a uma etapa de protocolo (`protocoloEtapaId`), exibir um checkbox no dialog de conclusão para também marcar a etapa como concluída automaticamente.

### Alterações

**Arquivo: `src/components/Agenda/DeadlineDetailDialog.tsx`**

1. Adicionar estado `cumprirEtapa` (boolean, default `true` quando há etapa vinculada)
2. No dialog de confirmação (linha ~541), após o bloco de subtarefa, adicionar um checkbox "Cumprir etapa do protocolo" que só aparece quando `deadline.protocoloOrigem` ou `deadline.protocoloEtapaId` existe e a etapa não está concluída
3. No `handleConfirmComplete`, quando `cumprirEtapa` estiver ativo, fazer update na tabela `project_protocolo_etapas` setando `status = 'concluido'`, `data_conclusao = now()`, `comentario_conclusao = comentarioConclusao`
4. Buscar o status atual da etapa no fetch para saber se já está concluída (e não mostrar o checkbox nesse caso)
5. Resetar `cumprirEtapa` junto com os outros estados no close do dialog

**Arquivo: `src/components/Agenda/AgendaContent.tsx`**
- Mesma lógica duplicada no dialog de conclusão que existe nesse arquivo (linhas ~1800)

### Visual
- Checkbox com ícone de etapa, texto "Cumprir etapa do protocolo" e nome da etapa abaixo
- Posicionado entre o checkbox de subtarefa e os botões de ação
- Vem pré-selecionado quando há etapa vinculada

