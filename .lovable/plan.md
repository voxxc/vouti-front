## Causa raiz

Em `src/components/Agenda/AgendaContent.tsx`, a função `isUserParticipant` (linhas 612–616) considera o **criador** do prazo (`createdByUserId`) como "participante" para fins de visibilidade na agenda:

```ts
const isUserParticipant = (deadline, userId) =>
  deadline.advogadoResponsavel?.userId === userId ||
  deadline.taggedUsers?.some(t => t.userId === userId) ||
  deadline.createdByUserId === userId ||   // ← raiz do problema
  deadline.completedByUserId === userId;
```

Como `deadlines.user_id` é sempre carimbado com o id de quem clicou em "Criar prazo" (ver `CreateDeadlineDialog.tsx:118` e `AgendaContent.tsx:725`), Lara e Izabelita — que criam prazos em nome de terceiros (Solvenza) — passam a aparecer como participantes mesmo sem terem responsabilidade real, e o prazo é exibido na agenda delas como se fosse delas.

O comentário no código indica que esse comportamento foi adicionado para corrigir um bug antigo onde o criador via o prazo no Projeto mas não na Agenda. Hoje esse cenário não existe mais: se a pessoa quer acompanhar, ela se coloca como **advogado responsável**, **tagged** ou recebe pela RLS de admin/controller.

## Correção

1. **Remover o critério de criador** do `isUserParticipant` em `AgendaContent.tsx`. Visibilidade na agenda passa a depender apenas de:
   - Ser o advogado responsável
   - Estar marcado em `deadline_tags`
   - Ter concluído o prazo (`completedByUserId`)
   - Ser admin/controller (que já vê tudo via filtro "Todos")

2. **Manter** a exibição do badge "Criado por X" no detalhe do prazo (`createdByName`/`createdByAvatar` em `DeadlineDetailDialog`) — só removemos o critério de visibilidade, não a rastreabilidade.

3. **Não alterar** RLS nem o insert: continuar gravando `deadlines.user_id = auth.uid()` para auditoria de quem criou.

4. **Auditoria opcional (Solvenza, retroativa)**: rodar uma query SELECT (sem mudança de dados) para listar quantos prazos cada criador (Lara/Izabelita) gerou para outros usuários nos últimos 90 dias — só pra dimensionar o impacto antes do deploy.

## Arquivos afetados

- `src/components/Agenda/AgendaContent.tsx` — alterar `isUserParticipant` (1 linha) e o comentário acima dela.
- Nenhum outro arquivo precisa mudar (o hook `useAgendaData.ts` não filtra por participante; usa o mesmo critério no consumidor).
- **Sem migration, sem RLS, sem edge function.**

## Impacto

1. **Usuário final (UX)**:
   - Lara, Izabelita e qualquer outro perfil que cria prazos para terceiros **deixam de ver na própria agenda** os prazos que criaram para outros.
   - Continuam vendo na agenda apenas os prazos onde são responsáveis, marcadas (@) ou que concluíram.
   - Quando precisarem auditar o que criaram, usam o filtro "Todos" (se forem admin/controller) ou a Central de Subtarefas.
   - Detalhe do prazo continua mostrando "Criado por …" para todos.

2. **Dados**:
   - Nenhuma migration. Nenhuma RLS alterada.
   - Nenhuma performance change (filtro client-side, mesma query).
   - `deadlines.user_id` segue gravado normalmente (rastreabilidade preservada).

3. **Riscos colaterais**:
   - Quem hoje *intencionalmente* criava um prazo "pra si" sem se colocar como responsável passaria a não ver na agenda. Mitigação: a criação já força `advogado_responsavel_id` (campo obrigatório no `CreateDeadlineDialog`); quem cria pra si, escolhe a si mesma.
   - Possíveis prazos antigos sem `advogado_responsavel_id` ainda ficariam invisíveis para o criador. Vou verificar se existem (`SELECT COUNT(*) WHERE advogado_responsavel_id IS NULL`) e, se houver, listo num CSV pra triagem antes do deploy.

4. **Quem é afetado**:
   - **Diretamente**: Lara, Izabelita e qualquer perfil "comercial/agenda/financeiro" do tenant Solvenza que criava prazos em nome de outros.
   - **Indiretamente**: todos os tenants — porque o critério é global. Mas o efeito é apenas tirar prazos "estranhos" da agenda do criador, não esconder nada de quem é responsável de fato.
   - **Não afeta**: admins/controllers (continuam com o filtro "Todos" como padrão).

## Validação

1. Logar como **Lara** no Solvenza, abrir Agenda → confirmar que prazos onde ela é só criadora (e não responsável/tag) **sumiram**.
2. Logar como o **advogado responsável** desses prazos → confirmar que continuam aparecendo normalmente.
3. Abrir um prazo que ela criou → confirmar que o badge "Criado por Lara" continua visível no detalhe.
4. Logar como admin Solvenza com filtro "Todos" → confirmar que continua vendo tudo.
5. Repetir o teste no módulo CRM (mesmo componente, `module='crm'`) para garantir que nada quebra lá.

Quer que eu execute?