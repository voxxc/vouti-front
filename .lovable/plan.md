## Causa raiz
Hoje as linhas da tabela em `PrazosOrfaosTab` mostram dados mas não abrem o detalhe do prazo. O usuário quer clicar na linha (no título/conteúdo) e abrir o mesmo modal usado na Agenda, mantendo o botão "Vincular" ao lado.

## Correção
Reaproveitar `DeadlineDetailDialog` (`src/components/Agenda/DeadlineDetailDialog.tsx`), que já aceita `deadlineId` + `open` + `onOpenChange`.

Em `src/components/Controladoria/PrazosOrfaosTab.tsx`:
1. Importar `DeadlineDetailDialog`.
2. Adicionar estado `selectedDeadlineId: string | null`.
3. Tornar a `<TableRow>` clicável (`cursor-pointer`, `hover:bg-muted/40`) com `onClick={() => setSelectedDeadlineId(row.id)}`.
4. Em `TableCell` de Ações, adicionar `onClick={(e) => e.stopPropagation()}` para que os botões Vincular/Excluir continuem funcionando sem abrir o modal.
5. Renderizar `<DeadlineDetailDialog deadlineId={selectedDeadlineId} open={!!selectedDeadlineId} onOpenChange={(o) => !o && setSelectedDeadlineId(null)} />` ao fim do componente.
6. Após o modal disparar evento de mudança (já existe `dispatchDeadlineChange`), opcionalmente recarregar `fetchData()` para refletir vínculos/exclusões feitas pelo modal — adicionar listener leve do evento `deadline-changed` se já houver padrão; caso contrário, manter atualização manual via botão "Atualizar".

## Arquivos afetados
- `src/components/Controladoria/PrazosOrfaosTab.tsx` (única edição)

## Impacto
1. **UX**: cada linha de Prazo OF vira clicável; abre o modal padrão da Agenda (mesmo dos cards de prazo) com comentários, edição, conclusão, etc. Botão "Vincular" e o ícone de excluir continuam exatamente onde estão, sem disparar o modal.
2. **Dados**: zero alteração. Sem migrations, RLS ou novas queries; o modal já busca seus próprios dados por `deadlineId`.
3. **Riscos colaterais**: muito baixos. Único cuidado é o `stopPropagation` nas ações para não abrir o modal junto. Se o usuário concluir/vincular pelo modal, a linha pode ficar listada até clicar em "Atualizar" — aceitável.
4. **Quem é afetado**: todos os usuários com acesso à página `/:tenant/prazoof` (sem gating de role, igual hoje).

## Validação
1. Em `/solvenza/prazoof`, clicar em qualquer linha → abre o `DeadlineDetailDialog` com os dados corretos.
2. Clicar em "Vincular" → abre o dialog de vínculo, NÃO abre o detalhe.
3. Clicar no ícone de lixeira → abre o `AlertDialog` de exclusão, NÃO abre o detalhe.
4. Fechar o modal → estado limpa, lista permanece com filtros/busca preservados.
