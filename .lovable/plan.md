## Causa raiz / contexto

- Hoje o card de "Monitoramento Diário" no resumo do processo (`ProcessoOABDetalhes.tsx`) só conhece o fluxo Judit (toggle + credencial Judit).
- Já existe a edge function `escavador-ativar-e-buscar` (e a tabela `processo_monitoramento_escavador`), mas ela só está plugada num hook usado em outras telas — nunca aparece no resumo do processo OAB.
- O usuário quer um botão paralelo, abaixo do card Judit, que só apareça para `danieldemorais.e@gmail.com` (admin do tenant Solvenza). Decisão acordada: usar uma flag por usuário em `profiles` (`escavador_beta`).

## Correção (passo a passo)

### 1. Migration — flag por usuário
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS escavador_beta boolean NOT NULL DEFAULT false;`
- `UPDATE public.profiles SET escavador_beta = true WHERE id = (SELECT id FROM auth.users WHERE email = 'danieldemorais.e@gmail.com');` (rodada via insert tool depois do schema, sem hardcode no código).
- Sem mudança de RLS — a coluna é lida pelo próprio dono via política existente em `profiles`.

### 2. Hook `useEscavadorBeta`
Novo `src/hooks/useEscavadorBeta.ts`: lê `profiles.escavador_beta` do usuário logado (uma vez, com cache em memória) e retorna `boolean`. Usa o `auth.uid()` atual; sem checagem de tenant (a flag já é por usuário).

### 3. Card de monitoramento Escavador no resumo
Em `src/components/Controladoria/ProcessoOABDetalhes.tsx`, logo abaixo do `<Card>` "Monitoramento Diario" (linha ~781):

- Renderizar um novo `<Card>` apenas se `useEscavadorBeta()` for `true`.
- Conteúdo: ícone + título "Monitoramento via Escavador (beta)", descrição curta, badge "Beta", e um botão "Ativar monitoramento" (ou "Reconsultar" se já houver registro).
- Estado local `ativandoEscavador` + `escavadorAtivo` (consulta inicial em `processo_monitoramento_escavador` por `processo_id = processo.id`, filtrando `tenant_id`).
- Ao clicar: `AlertDialog` de confirmação → `supabase.functions.invoke('escavador-ativar-e-buscar', { body: { processoId: processo.id, numeroProcesso: processo.numero_cnj } })` → toast de sucesso/erro → atualiza estado local.
- Sem mexer no toggle Judit, sem novo edge function, sem novos secrets.

### Detalhes técnicos
- `escavador-ativar-e-buscar` já existe e usa `ESCAVADOR_API_TOKEN` (global). Nenhum secret novo.
- A FK de `processo_monitoramento_escavador.processo_id` aponta para `processos`. No resumo OAB estamos em `processos_oab`. **Risco real**: o `INSERT` dentro da edge function vai falhar por FK quando `processo.id` for de `processos_oab`. Mitigação no plano: ajustar a edge function para aceitar uma flag `origem: 'oab'` e, nesse caso, gravar em `processo_monitoramento_escavador` apenas se o id existir em `processos`, caso contrário gravar em `processos_oab` (campos novos `escavador_*`) ou pular a persistência e só retornar as movimentações. **Decisão sugerida**: por ser beta de UI, na primeira iteração apenas chamar a função com `processoId` da tabela `processos` quando o resumo já estiver vinculado a ela; quando vier de `processos_oab`, mostrar o botão mas deixar a action desabilitada com tooltip "Em breve para processos OAB". Confirmo com você antes de mexer no schema do Escavador.

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — coluna `escavador_beta` em `profiles`.
- (data) `UPDATE` em `profiles` para o usuário Daniel via insert tool.
- `src/hooks/useEscavadorBeta.ts` — novo.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — novo card abaixo do card Judit.

## Impacto

1. **UX/telas**: somente o usuário `danieldemorais.e@gmail.com` vê um card extra "Monitoramento via Escavador (beta)" no resumo do processo OAB, abaixo do card de Monitoramento Diário (Judit). Para todos os outros usuários (Solvenza incluso) nada muda.
2. **Dados**: nova coluna booleana em `profiles` (default false, sem backfill perigoso). Nenhuma mudança em RLS, índices, performance. A edge function `escavador-ativar-e-buscar` continua igual; a única gravação adicional ocorre em `processo_monitoramento_escavador` quando o usuário clicar em ativar (e apenas para processos da tabela `processos`).
3. **Riscos colaterais**:
   - FK de `processo_monitoramento_escavador` aponta para `processos`. Se o botão for clicado a partir de um `processos_oab` puro, o INSERT falha. Plano cobre isso desabilitando a ação nesse caso até decidirmos a estratégia de persistência.
   - Custo Escavador: a função consome a API paga. Como a flag está restrita a 1 usuário, o impacto financeiro é controlado.
   - Visual: o card adiciona altura ao resumo apenas para esse usuário; não afeta layout dos demais.
4. **Quem é afetado**: apenas `danieldemorais.e@gmail.com`. Admins, advogados, super-admins e demais usuários da Solvenza e dos outros tenants não veem nem disparam a ação.

## Validação

- Logar como Daniel → abrir resumo de um processo OAB → ver card "Monitoramento via Escavador (beta)" abaixo do card Judit.
- Logar como qualquer outro usuário do mesmo tenant Solvenza → card não aparece.
- Clicar "Ativar" (em processo de `processos`) → toast de sucesso e linha em `processo_monitoramento_escavador`.
- Clicar em processo OAB-puro → botão desabilitado com tooltip explicativo (até decidirmos a persistência).
- `SELECT escavador_beta FROM profiles WHERE …` retorna `true` só para Daniel.
