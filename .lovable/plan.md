

## Status atual

**Não, ainda não foi aplicado.** O que aconteceu na conversa:

1. Você pediu o filtro de admin nas abas Colunas + Prazos
2. Eu apresentei um plano e fiz uma pergunta de clarificação ("qual comportamento exato?")
3. Você respondeu: **"Ambos os comportamentos acima"** — funcionar nas duas abas
4. Em seguida você pediu para eu adicionar a seção "Impacto" em todos os planos
5. Eu salvei essa preferência em memória (`mem://~user`)
6. **Antes de eu re-apresentar o plano do filtro com a nova seção Impacto, você mandou esta mensagem perguntando se já tinha sido aplicado**

Ou seja: o plano foi aprovado conceitualmente, mas o código ainda não foi alterado. Vou re-apresentar agora no novo formato (com Impacto) pra você aprovar e aí sim implementar.

## Causa raiz

Dois bugs distintos no filtro de usuário do Planejador:

**Bug 1 — Aba "Prazos" ignora o filtro de usuário**
`PlanejadorPrazosView.tsx` (linha ~36) filtra **fixamente** pelo `user?.id` do usuário logado. Quando admin troca o usuário no dropdown do TopBar, a aba Prazos continua mostrando só os prazos dele.

**Bug 2 — Aba "Colunas" (Kanban) precisa de validação**
A `filterTasks` no `PlanejadorKanban.tsx` já tem a lógica certa (`proprietario_id || responsavel_id || participantTaskIds`), mas falta auditar se o `participantTaskIds` está sendo recarregado corretamente quando o admin troca de usuário no dropdown, e garantir que o caso "Todos" (selectedUserId = null) realmente mostra todas as tasks do tenant.

## Correção

1. **`PlanejadorPrazosView.tsx`**: aceitar props `selectedUserId` e `currentUserId`. Trocar `userId = user?.id` por `userId = selectedUserId ?? currentUserId`. Quando `selectedUserId === null` (Todos), não filtrar por usuário.
2. **`PlanejadorDrawer.tsx`**: passar `selectedUserId` e `currentUserId` pro `<PlanejadorPrazosView>`.
3. **`PlanejadorKanban.tsx`**: auditar `filterTasks` e garantir que a query `planejador-all-participants` re-executa quando `selectedUserId` muda.

## Arquivos afetados

- `src/components/Planejador/PlanejadorPrazosView.tsx` — adicionar props e trocar fonte do `userId`
- `src/components/Planejador/PlanejadorDrawer.tsx` — passar props novos
- `src/components/Planejador/PlanejadorKanban.tsx` — verificação/ajuste fino do filtro

## Impacto

- **Usuário final (UX)**:
  - Admin agora consegue trocar entre advogados no dropdown do TopBar e ver tanto as **colunas (Kanban)** quanto os **prazos** do colega selecionado.
  - Selecionar "Todos" mostra todas as tasks/prazos do tenant inteiro nas duas abas — útil pra ter visão geral, mas pode deixar a tela mais carregada visualmente em escritórios grandes.
  - Comportamento consistente entre as duas abas (hoje cada uma reage de um jeito diferente).
- **Dados**: zero mudanças. Sem migration, sem alteração de RLS, sem novas tabelas. Mudança puramente frontend.
- **Performance**: sem impacto significativo. As queries já existem; muda só o argumento `selectedUserId` passado pra elas.
- **Riscos colaterais**:
  - **Baixo**. RLS continua protegendo: advogado comum que tentar selecionar outro user vai ver só o que já tem direito (tasks compartilhadas, participantes). Nada de privilege escalation.
  - Único ponto de atenção: se algum advogado não-admin já usava o dropdown, agora ele vai notar que filtra também na aba Prazos (antes não filtrava). Mudança de comportamento sutil mas correta.
- **Quem é afetado**:
  - **Admins/controllers**: ganham a visão completa pedida.
  - **Advogados/estagiários**: comportamento inalterado na prática (RLS já limita).
  - **Todos os tenants** do sistema jurídico, automaticamente.

## Validação

1. Logar como admin → abrir Planejador → aba **Colunas** → trocar usuário no dropdown pra outro advogado → confirmar que aparecem as tasks dele (proprietário, responsável ou participante).
2. Mesma sessão → aba **Prazos** → trocar usuário → confirmar que aparecem os prazos do advogado selecionado.
3. Selecionar **"Todos"** nas duas abas → confirmar que mostra tudo do tenant.
4. Logar como advogado comum → trocar pra outro user → confirmar que continua vendo só o que tem direito (RLS).

