## Causa raiz

Prazos podem ficar "órfãos" (sem `protocolo_etapa_id` e sem `processo_oab_id`) por **3 fluxos** distintos:

1. **Agenda → Novo Prazo** (`src/components/Agenda/AgendaContent.tsx`, linhas 724-738): permite salvar com `protocolo_etapa_id = NULL` quando o usuário escolhe Projeto + Workspace mas pula a seleção de protocolo.
2. **Caso/Projeto → aba Tarefas** (`src/components/Project/TaskTarefasTab.tsx`, linhas 177-191 e 325-339): o form **nem oferece** seleção de protocolo/etapa — todos os prazos criados aqui já nascem sem vínculo.
3. **Controladoria → TarefasTab** (`src/components/Controladoria/TarefasTab.tsx`): este preenche `processo_oab_id`, então não cria órfão — fora do escopo do bug.

Além disso, várias listagens de prazos ainda usam `.from('deadlines').select(...)` sem `fetchAllPaginated`, então acima de 1000 linhas o resultado é truncado silenciosamente — risco de "sumiço" de informação.

### Diagnóstico Solvenza

- Lara: 42 prazos órfãos (de 107 totais).
- Izabelita: 23 prazos órfãos (de 790 totais).
- Total: **65 órfãos**, concentrados em projetos com múltiplos protocolos por workspace — auto-vinculação por SQL não é confiável.

## Correção

### 1. Nova aba "Prazos OF" na Controladoria (revisão manual)

- Novo componente `src/components/Controladoria/PrazosOrfaosTab.tsx`.
- Lista **todos** os prazos do tenant onde `protocolo_etapa_id IS NULL` **E** `processo_oab_id IS NULL` **E** `project_id IS NOT NULL` (definição de "órfão real" — tem projeto mas nenhum vínculo de protocolo/processo).
- Colunas: nº, título, descrição, data, projeto, workspace, cliente, criador, responsável, status, criado em.
- Filtros: por criador, por projeto, por workspace, por período, e busca textual.
- Ações por linha:
  - **Vincular Protocolo**: abre dropdown listando protocolos do projeto+workspace. Após escolher, oferece dropdown de Etapa (opcional). Salva `protocolo_etapa_id`/`processo_oab_id` e recarrega.
  - **Abrir prazo**: reaproveita `DeadlineDetailDialog`.
  - **Excluir**: confirmação dupla (caso o prazo seja erro).
- Carregamento via `fetchAllPaginated` (sem limite de 1000).
- Registrar nova aba em `src/pages/Controladoria.tsx` (após "Push-Doc").

### 2. Prevenir novos órfãos (3 fluxos)

**2a) Agenda (`AgendaContent.tsx`):**
- Se `formData.projectId` está preenchido e `availableProtocolos.length > 0`, exigir `selectedProtocoloId` (toast bloqueante).
- Marcar campo Protocolo como obrigatório visualmente (asterisco).

**2b) Caso/Projeto → aba Tarefas (`TaskTarefasTab.tsx`):**
- Adicionar seletor de **Protocolo** (filtrado por `project_id` + workspace) e **Etapa** (filtrado por protocolo escolhido) nos dois forms (nova tarefa e novo prazo).
- Protocolo: obrigatório quando o projeto tiver protocolos cadastrados; opcional ("Sem protocolo") caso contrário.
- Salvar `protocolo_etapa_id` e `processo_oab_id` no insert.

**2c) Sem alteração na Controladoria/TarefasTab** (já vincula processo).

### 3. Remover limite de 1000 linhas em listagens de deadlines

Padronizar todas as listagens "todos os prazos" para `fetchAllPaginated` de `@/lib/supabasePagination`:

- `src/hooks/useAgendaData.ts` — já tem paginação manual; refatorar para usar o helper padrão e remover o `for (let i = 0; i < 20)`.
- `src/components/Dashboard/PrazosAbertosPanel.tsx`
- `src/components/Dashboard/PrazosDistributionChart.tsx`
- `src/components/Dashboard/Metrics/AdvogadoMetrics.tsx`
- `src/components/Dashboard/Metrics/FinanceiroMetrics.tsx`
- `src/components/Controladoria/ControladoriaIndicadores.tsx`
- `src/components/Controladoria/CentralPrazosConcluidos.tsx`
- `src/components/Controladoria/CentralSubtarefas.tsx`
- `src/components/Controladoria/PrazosCasoTab.tsx`
- `src/components/Agenda/AgendaContent.tsx` (qualquer SELECT de listagem)
- `src/components/Search/GlobalSearch.tsx`
- `src/hooks/useProcessosMetrics.ts`
- `src/hooks/usePrefetchPages.ts`

Revisão arquivo a arquivo: onde for "janela limitada" (ex.: últimas N), mantém `.limit()`; onde for "todos", troca para `fetchAllPaginated`.

## Arquivos afetados

- `src/components/Controladoria/PrazosOrfaosTab.tsx` (novo)
- `src/pages/Controladoria.tsx` (registrar a aba)
- `src/components/Agenda/AgendaContent.tsx` (validação + paginação)
- `src/components/Project/TaskTarefasTab.tsx` (seletor Protocolo/Etapa)
- `src/hooks/useAgendaData.ts` (refatorar paginação)
- Arquivos listados acima (substituir SELECTs por `fetchAllPaginated`)
- Sem migração de schema. Sem mudança de RLS.

## Impacto

1. **Usuário final (UX/telas/fluxos):**
   - **Nova aba "Prazos OF" na Controladoria** com os 65 órfãos do Solvenza (e de qualquer tenant), com ação de vincular protocolo/etapa direto da lista.
   - Ao criar prazo pela **aba Tarefas do Caso**, surge o seletor de Protocolo/Etapa — antes inexistente.
   - Ao criar prazo pela **Agenda**, quando o projeto tem protocolos, a seleção passa a ser **obrigatória**.
   - Listagens deixam de truncar em 1000 linhas — usuários com volume alto (Solvenza, Izabelita com 790 prazos) passam a ver tudo.

2. **Dados (migrations, RLS, performance):**
   - Sem migração, sem mudança de RLS, sem trigger novo.
   - Performance: listagens passam a fazer múltiplas requisições paginadas (1 a cada 1000 linhas). Imperceptível abaixo de 5k linhas; aceitável até 50k (hardCap do helper).

3. **Riscos colaterais:**
   - Fluxo legítimo de "prazo avulso ligado só ao projeto, sem protocolo" fica bloqueado quando o projeto tem protocolos. Mitigação: a obrigatoriedade só dispara se `availableProtocolos.length > 0`.
   - Paginação aumenta latência em painéis pesados (Dashboard de tenants grandes). Mitigação: helper já tem `hardCap` e ordenação estável; medir antes de aplicar em hooks de KPI muito quentes — se precisar, manter limite explícito e documentar.
   - Refatorar muitos arquivos de uma vez pode introduzir regressões. Mitigação: revisar diff por arquivo e validar visualmente cada painel afetado.

4. **Quem é afetado:**
   - **Todos os tenants** (validação na Agenda, novo seletor no Caso, paginação correta).
   - **Solvenza** especificamente para limpar os 65 órfãos via a nova aba.
   - **Admin/Controller** que tenham acesso à Controladoria veem a nova aba "Prazos OF".

## Validação

- Acessar `/solvenza/controladoria` → nova aba "Prazos OF" listando os 65 órfãos com filtros funcionando.
- Vincular 1 prazo manualmente a um protocolo → prazo some da aba e aparece dentro do protocolo escolhido.
- Criar prazo na aba **Tarefas do Caso** sem escolher protocolo (em projeto com protocolos cadastrados) → bloqueio com toast.
- Criar prazo na **Agenda** com projeto que tem protocolos sem selecionar protocolo → bloqueio com toast.
- Criar prazo em projeto sem protocolos → fluxo continua passando (com `protocolo_etapa_id = NULL`, mas aparece corretamente como "avulso" — esse padrão é aceitável).
- Tenant Solvenza com 790+ prazos: abrir Agenda e confirmar que todos aparecem (não trunca em 1000).
- Verificar que Dashboard/Controladoria continuam carregando em tempo razoável (< 3s) após paginação.