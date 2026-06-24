# Card de Revisional: abrir Visualizador ao clicar

## Causa raiz
Hoje o clique no card abre um dropdown de ações. O usuário prefere que o clique abra direto um **visualizador** com os detalhes da revisional, e que a edição aconteça dentro desse visualizador.

## Correção

1. **Novo componente `RevisionalViewerDialog`** (dentro de `PlanejadorRevisionaisView.tsx` ou arquivo próprio em `src/components/Planejador/`):
   - Dialog (shadcn) com duas modos: **view** (padrão) e **edit**.
   - **Modo view** mostra:
     - Título, descrição, cliente
     - Status (badge)
     - Criado por / em
     - Atribuído a / em (se houver)
     - Link "Ver prazo" (se `deadline_id`)
     - Botões no rodapé: **Editar**, **Atribuir** (se pendente), **Arquivar/Reabrir**, **Excluir**, **Fechar**
   - **Modo edit** (ao clicar em Editar dentro do viewer):
     - Mesmos campos viram inputs (título, descrição, cliente)
     - Botões: **Salvar** / **Cancelar** (volta para view sem fechar o dialog)
     - Usa `useUpdateRevisional`

2. **`RevisionalCard`**:
   - Remover o `DropdownMenu` que envolve o card.
   - Card volta a ser um `div` clicável (`role="button"`, `tabIndex={0}`, Enter/Space) que chama `onOpenViewer(revisional)`.
   - Manter `cursor-pointer`, hover e foco visíveis.
   - Botão "..." removido (ou mantido como atalho secundário — sugiro **remover** para não duplicar).
   - "Ver prazo" interno continua com `stopPropagation`.

3. **`PlanejadorRevisionaisView`**:
   - Novo estado `viewerRevisional`.
   - Card → `onOpenViewer` abre `RevisionalViewerDialog`.
   - Ações de Atribuir/Arquivar/Reabrir/Excluir disparadas pelo viewer reusam os handlers atuais (`setAtribuirRevisional`, `arquivar`, `reabrir`, `deletar`).
   - Diálogo de criar/editar atual (`CreateEditDialog`) é reutilizado: clicar **Editar** no viewer fecha o viewer e abre o `CreateEditDialog` em modo edição (ou alterna o viewer para modo edit inline — vou usar **edição inline** dentro do viewer para evitar pular de modal).

## Arquivos afetados
- `src/components/Planejador/PlanejadorRevisionaisView.tsx` — refatorar `RevisionalCard`, adicionar `RevisionalViewerDialog`, novo estado/handler de viewer.

## Impacto
1. **UX**: clicar em qualquer parte do card abre um modal com todos os detalhes da revisional. Editar passa a ser uma ação secundária dentro do viewer, reduzindo cliques para "só dar uma olhada". Atribuir/Arquivar/Excluir continuam acessíveis pelos botões do rodapé do viewer.
2. **Dados**: nenhuma mudança de schema, RLS ou queries. Apenas reuso dos hooks existentes (`useUpdateRevisional`, `useArquivar/Reabrir/DeleteRevisional`, `useAtribuirRevisional`).
3. **Riscos colaterais**: pequeno — o "Ver prazo" precisa continuar com `stopPropagation` no card e funcionar também a partir do viewer. Garantir que o modo edit não dispare update se nada mudou.
4. **Quem é afetado**: somente usuários do tenant **Solvenza** na aba Revisionais do Planejador. Demais tenants e módulos não são tocados.

## Validação
- Clicar no card abre o viewer com os dados corretos.
- Botão "Editar" no viewer alterna para inputs editáveis; "Salvar" persiste via `useUpdateRevisional` e volta para view; "Cancelar" descarta.
- Atribuir abre o fluxo atual de seleção de usuário + `CreateDeadlineDialog`.
- Arquivar/Reabrir/Excluir continuam funcionando e fecham o viewer.
- "Ver prazo" funciona tanto no card quanto no viewer sem fechar/abrir indevidamente.
- Teclado: Enter/Space no card abre o viewer; Esc fecha.
