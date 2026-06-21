## Causa raiz

O drawer de Movimentos Manuais (super admin) hoje mostra uma única lista plana de processos. Para revisão semanal, falta um mecanismo de "fila de trabalho": separar o que ainda precisa ser revisado do que já foi atualizado nesta rodada, com expiração automática de 7 dias.

## Correção

### 1. Persistência da marcação "atualizado"

Adicionar duas colunas em `public.processos_oab`:

- `super_admin_atualizado_em timestamptz null`
- `super_admin_atualizado_por uuid null`

Sem migration de RLS nova — a tabela já tem políticas; a edge function escreve via service role.

Regra de janela: um processo está "Atualizado" enquanto `super_admin_atualizado_em >= now() - interval '7 days'`. Após isso some da aba Atualizado e reaparece em Total automaticamente (consulta baseada em data, sem job).

### 2. Edge function `super-admin-listar-processos-oab`

- Aceitar parâmetro `aba: 'total' | 'atualizado'`.
- `total`: retorna processos cujo `super_admin_atualizado_em` é nulo OU `< now() - 7 dias` (ou seja, exclui os marcados nos últimos 7 dias — conforme a regra confirmada de não duplicar entre abas).
- `atualizado`: retorna apenas processos com `super_admin_atualizado_em >= now() - 7 dias`, ordenados por essa data desc.
- Incluir `super_admin_atualizado_em` no payload para exibir "marcado há X dias" e a contagem regressiva (faltam Y dias).

### 3. Edge function `super-admin-criar-andamento-manual`

- Aceitar novo campo opcional `marcar_como_atualizado: boolean` no body.
- Quando `true`: após inserir o andamento, fazer `update processos_oab set super_admin_atualizado_em = now(), super_admin_atualizado_por = auth.uid() where id = ...`.
- Quando `false`/omitido: comportamento atual, sem alterar a marcação.

### 4. UI — `SuperAdminMovimentosManuaisDrawer.tsx`

- Adicionar `Tabs` com underline ("Total" | "Atualizado") logo abaixo do header.
- Cada aba dispara um fetch separado ao mudar (passa `aba` para a edge function); manter busca/paginação por aba.
- Badge com contagem ao lado de cada aba.
- Coluna extra na tabela quando `aba === 'atualizado'`: "Atualizado em" com data e "expira em N dias".

### 5. UI — `AdicionarMovimentoManualDialog.tsx`

- Novo checkbox abaixo de "Marcar como não lido": **"Marcar processo como atualizado (move para a aba Atualizado por 7 dias)"**, default `true`.
- Encaminhar o valor para a edge function via `marcar_como_atualizado`.

### 6. UI — `SuperAdminProcessoOABDetalhesPanel.tsx`

- Mostrar badge no header quando `super_admin_atualizado_em` estiver dentro da janela ("Atualizado · expira em N dias").
- Após salvar movimento, recarregar a lista do drawer pai (já existe `onAndamentoCriado`) para refletir a movimentação entre abas.

## Arquivos afetados

- `supabase/migrations/<nova>` — adiciona as 2 colunas em `processos_oab` (sem mudar RLS/grants).
- `supabase/functions/super-admin-listar-processos-oab/index.ts` — filtro por aba + campo no payload.
- `supabase/functions/super-admin-criar-andamento-manual/index.ts` — aceitar `marcar_como_atualizado` e atualizar timestamp.
- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — abas, contagens, coluna "Atualizado em".
- `src/components/SuperAdmin/AdicionarMovimentoManualDialog.tsx` — checkbox novo, propagação do flag.
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx` — badge de status atualizado.

## Impacto

1. **Usuário final (super admin)**: ganha fluxo de revisão semanal — abre Total, processa um a um, marca movimento + "atualizado", o processo migra automaticamente para Atualizado e some de Total. Após 7 dias volta para Total para nova revisão. Demais usuários do tenant não veem nada novo.
2. **Dados**: 2 colunas nullable em `processos_oab` (sem default pesado, backfill desnecessário). Nenhum índice obrigatório agora — volume cabe sem índice; se o filtro ficar lento, adicionar índice parcial em `super_admin_atualizado_em` depois. Sem mudança de RLS/grants.
3. **Riscos colaterais**: pequeno — colunas só são lidas/escritas pelas edge functions de super admin. Nenhum hook ou componente do tenant consulta essas colunas. Cuidado para a query de Total NÃO contar processos marcados (a contagem de "andamentos" exibida hoje continua igual).
4. **Quem é afetado**: apenas super admins usando o drawer de Movimentos Manuais. Tenants, advogados, agenda, financeiro etc. não percebem nada.

## Validação

- Marcar um processo como atualizado via dialog → some de Total, aparece em Atualizado com "expira em 7 dias".
- Desmarcar o checkbox ao salvar → processo permanece em Total, recebe o andamento normalmente.
- Simular `super_admin_atualizado_em` para 8 dias atrás (UPDATE manual) → recarregar drawer; processo deve voltar para Total e sumir de Atualizado.
- Contagens das abas batem com o número de linhas exibidas.
- Usuário comum (não super admin) chamando a edge function continua recebendo 403.