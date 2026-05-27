## Causa raiz
O `DeadlineDetailDialog` abre o detalhe do prazo com `DialogContent` em `z-[80]`, mas o `AlertDialog` de concluir/reabrir usa o empilhamento padrão do shadcn/Radix. No Planejador, isso fica dentro do contexto do `Sheet`, então o modal de confirmação compete com o modal de detalhe e pode aparecer atrás/embaixo dele ou ficar com interação bloqueada.

## Correção
1. Criar um estado derivado como `actionDialogOpen = !!confirmCompleteId || !!reopenDeadlineId`.
2. Enquanto `actionDialogOpen` estiver ativo, esconder/desmontar temporariamente o `DialogContent` do detalhe do prazo, mantendo o componente e os dados carregados vivos.
3. Manter os `AlertDialog` de concluir/reabrir como irmãos do `Dialog`, com `AlertDialogContent` acima do detalhe usando um z-index maior e consistente.
4. Ao cancelar, limpar o estado da ação e o detalhe volta a aparecer normalmente.
5. Ao confirmar conclusão/reabertura, manter o comportamento atual de atualizar Supabase, atualizar estado local e disparar `dispatchDeadlineChange`.

## Arquivos afetados
- `src/components/Agenda/DeadlineDetailDialog.tsx`
  - Ajuste no controle de abertura/renderização do detalhe.
  - Ajuste no empilhamento dos `AlertDialogContent` de conclusão e reabertura.

## Impacto
1. **Usuário final:** ao clicar em “Marcar como Concluído” pelo Planejador, o modal de comentário/subtarefa/etapa aparece limpo, na frente, sem o detalhe do prazo por cima ou bloqueando cliques. Ao cancelar, volta para o detalhe do prazo.
2. **Dados:** nenhuma migration, RLS ou alteração de schema. O update de `deadlines`, criação de subtarefa e conclusão da etapa continuam iguais.
3. **Riscos colaterais:** baixo. A mudança afeta apenas a apresentação/empilhamento dos modais do detalhe de prazo. O fluxo da Agenda tende a ficar preservado porque usa o mesmo componente, apenas com comportamento mais seguro para modais aninhados.
4. **Quem é afetado:** usuários que concluem ou reabrem prazos pelo Planejador e pela Agenda; principalmente advogados, agenda, controller e admin.

## Validação
- Abrir um prazo pelo Planejador > Prazos.
- Clicar em “Marcar como Concluído”.
- Confirmar que o modal de comentário/subtarefa/etapa aparece acima de tudo e aceita digitação/cliques.
- Cancelar e confirmar que o detalhe do prazo volta.
- Confirmar conclusão e verificar se o prazo muda para concluído e o Planejador atualiza via evento existente.