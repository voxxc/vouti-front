## Causa raiz

- Ao clicar num prazo na aba "Prazos" do Planejador (`PlanejadorPrazosView` → `PlanejadorDrawer`), o componente `DeadlineDetailDialog` é montado.
- O Planejador é um `Sheet` (Radix) já em modo modal. Dentro do detalhe, o botão "Marcar como Concluído" tenta abrir um `AlertDialog` aninhado (linhas 561–606 de `DeadlineDetailDialog.tsx`) para coletar comentário + subtarefa + cumprir etapa.
- Pelo histórico de comportamento Radix, abrir `AlertDialog` enquanto um `Dialog` modal está aberto (que por sua vez está dentro de um `Sheet`) costuma falhar silenciosamente: o overlay/portal do segundo modal fica atrás do Dialog ou os `pointer-events: none` aplicados ao body bloqueiam o clique. Resultado: o usuário aperta "Marcar como Concluído" e nada acontece.
- Este fluxo funciona na Agenda porque lá não há `Sheet` envolvendo o Dialog.

## Correção

1. Em `DeadlineDetailDialog.tsx`, desacoplar o `AlertDialog` de confirmação de conclusão e o `AlertDialog` de reabertura do `Dialog` principal:
   - Adicionar um `effect` que, quando `confirmCompleteId` (ou `reopenDeadlineId`) é setado, fecha o `Dialog` (chama `onOpenChange(false)`) antes de o `AlertDialog` abrir.
   - Após confirmar/cancelar, reabrir o `Dialog` se a ação for cancelada, ou apenas fechá-lo se concluída com sucesso.
2. Alternativa mais segura e equivalente: extrair os dois `AlertDialog` (conclusão e reabertura) para componentes irmãos renderizados pelo pai (`PlanejadorDrawer` e `AgendaContent`), recebendo `deadlineId` por prop, eliminando o aninhamento de modais.
3. Garantir que a confirmação dispare `dispatchDeadlineChange` e invalide as queries que o Planejador usa (`useAgendaData`), para a coluna "Concluído" refletir imediatamente.
4. Sem alteração de RLS, schema ou edge functions.

## Arquivos afetados

- `src/components/Agenda/DeadlineDetailDialog.tsx`
  - Ajuste do fluxo de abrir AlertDialog de conclusão/reabertura para evitar conflito com Dialog/Sheet pai.
- `src/components/Planejador/PlanejadorDrawer.tsx`
  - Apenas se optarmos por extrair os AlertDialogs para o pai (alternativa 2); caso a correção 1 baste, fica intocado.
- Sem migração de banco.

## Impacto

1. **Usuário final**
   - Ao concluir um prazo a partir do Planejador (aba "Prazos"), o diálogo de "Confirmar Conclusão do Prazo" passa a abrir normalmente, permitindo informar comentário, marcar criar subtarefa e cumprir etapa do protocolo, igual à Agenda.
   - A reabertura de prazo concluído também volta a funcionar pelo Planejador.
   - Sem mudança visual fora desse fluxo.

2. **Dados / Banco**
   - Nenhuma migration.
   - Mesma lógica de update em `deadlines`, insert em `deadline_subtarefas` e atualização de `protocolo_etapas` já existente.
   - Sem mudança em RLS, índices ou performance.

3. **Riscos colaterais**
   - Baixo. O comportamento na Agenda continua igual (lá nunca houve conflito).
   - Possível efeito visual de o Dialog do prazo fechar por um instante antes do AlertDialog aparecer, dependendo da abordagem 1; mitigado deixando o estado coordenado por um `useEffect`.

4. **Quem é afetado**
   - Todos os usuários que concluem prazos pelo Planejador (admin, controller, advogado, agenda, estagiário) e em todos os tenants.
   - Não afeta Super Admin nem o fluxo de criação de prazos.

## Validação

- Abrir Planejador → aba "Prazos" → clicar em um prazo pendente → "Marcar como Concluído" → confirmar que o AlertDialog abre, aceita comentário, opções de subtarefa e cumprir etapa, e conclui o prazo.
- Repetir o teste para reabrir um prazo concluído pelo Planejador.
- Repetir o mesmo fluxo na Agenda para garantir que nada quebrou.
- Verificar que a coluna "Concluído" do Planejador atualiza após a confirmação.