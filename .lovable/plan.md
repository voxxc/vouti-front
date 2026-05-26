## Causa raiz

Hoje (a) o dialog de importar CNJ não captura a qual tribunal/credencial Judit o processo pertence, e (b) o drawer do processo não permite ajustar essa amarração antes de reativar o monitoramento. Sem isso, o `judit-ativar-monitoramento` continua usando `credenciais[0]` aleatoriamente e processos sigilosos voltam sem andamentos.

Este plano cobre **apenas a preparação do ambiente** — vínculo do processo a uma credencial e a UI para definir/editar manualmente. A regeração em massa fica para depois.

## Correção

### 1. Modelo de dados
- Migration: adicionar `processos_oab.judit_system_name text` (nullable) e `processos_oab.judit_customer_key text` (nullable, snapshot do customer_key escolhido — fica fácil auditar e usado direto no payload).
- Index leve: `(tenant_id, judit_system_name)`.

### 2. Dialog "Importar Processo por CNJ" (modo único e em massa)
- Novo Select **obrigatório** "Tribunal / Credencial Judit" no `ImportarProcessoCNJDialog.tsx`.
- Opções carregadas via novo hook `useJuditSystemNames(tenantId)` que faz `SELECT id, system_name, customer_key FROM credenciais_judit WHERE tenant_id=? AND status='active' ORDER BY system_name` + opção fixa "Público (sem credencial)".
- No modo em massa, o select vale para todos os CNJs do lote.
- Valor escolhido é passado para `judit-buscar-processo-cnj` (novos campos `juditSystemName`, `juditCustomerKey`) e persistido em `processos_oab` no insert.

### 3. Drawer do processo — edição restrita
- Em `ProcessoOABDetalhes.tsx`, adicionar bloco "Credencial Judit" logo acima do toggle de monitoramento.
- Exibição: sempre visível (mostra `judit_system_name` atual ou "Público").
- **Edição**: só aparece quando `processo.monitoramento_ativo === false` **e** o usuário logado é `danieldemorais.e@gmail.com` (gate por email via `useAuth().user?.email`).
- Ao salvar: update em `processos_oab` com `judit_system_name` e `judit_customer_key` snapshot.
- Mensagem orientando: "Desative o monitoramento, ajuste a credencial e reative — um novo tracking será criado com essa credencial."

### 4. Ativar/desativar monitoramento usa a credencial do processo
- `judit-ativar-monitoramento`: trocar a busca de `credenciais[0]` por ler `processos_oab.judit_customer_key` do próprio processo. Se vazio → tracking público (sem `credential` no payload). Sempre `with_attachments: true`.
- `judit-desativar-monitoramento` já deleta o tracking na Judit — mantém comportamento. Garantir que registra em `tenant_banco_ids` (tipo `tracking_desativado`) como já faz.
- Resultado: cada ciclo desativar→ativar gera **um novo tracking_id**, ficando registrado no histórico.

### 5. Histórico no SuperAdmin
- `SuperAdminMonitoramento.tsx` já lê `tenant_banco_ids` (tipos `tracking` e `tracking_desativado`). Garantir que a coluna mostra `metadata.com_credencial` / `metadata.system_name` para visualizar pausa e reativação com a credencial nova.
- Pequeno ajuste: incluir `system_name` no metadata salvo por `judit-ativar-monitoramento`.

## Arquivos afetados

- Migration nova: `processos_oab` + index.
- `src/hooks/useJuditSystemNames.ts` (novo).
- `src/components/Controladoria/ImportarProcessoCNJDialog.tsx`.
- `supabase/functions/judit-buscar-processo-cnj/index.ts` — receber e persistir os campos.
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — bloco de credencial + edição gated.
- `supabase/functions/judit-ativar-monitoramento/index.ts` — usar `judit_customer_key` do processo, incluir `system_name` no metadata.
- `src/components/SuperAdmin/SuperAdminMonitoramento.tsx` — exibir credencial no histórico (ajuste de leitura).

## Impacto

**Usuário final (UX):**
- Dialog de importar CNJ ganha um Select obrigatório de credencial. Quem não tem credencial cadastrada vê só "Público".
- Operadores comuns continuam vendo o badge "Credencial: ..." no drawer mas **não conseguem editar**.
- Apenas o usuário `danieldemorais.e@gmail.com` da SOLVENZA enxerga o botão "Editar credencial" — e só com monitoramento pausado.
- Fluxo manual fica: pausar toggle → editar credencial → ligar toggle → novo tracking aparece no histórico do SuperAdmin.

**Dados:**
- 2 colunas nullable em `processos_oab` (migration leve, sem reescrita).
- Trackings existentes continuam funcionando como estão (sem mexer). Só os processos que o usuário editar e reativar vão ganhar credencial.
- Cada ciclo desativar/ativar gera 1 DELETE + 1 CREATE na Judit (consumo previsível, sob controle manual do usuário).
- Sem mudança em RLS.

**Riscos colaterais:**
- Gate por email é frágil em tese (qualquer alteração de email quebra), mas é exatamente o desejado — restrição temporária. Documentar isso em comentário no código.
- Se o usuário escolher `system_name` errado, a Judit pode rejeitar — tratar erro 4xx no `judit-ativar-monitoramento` e devolver mensagem clara no toast.
- Importações em massa antigas (sem `judit_system_name`) seguem ativas como hoje — nenhuma quebra.

**Quem é afetado:**
- Todos os tenants veem o novo campo no dialog de importação.
- Edição no drawer: apenas `danieldemorais.e@gmail.com` (SOLVENZA).
- SuperAdmin vê histórico enriquecido com nome da credencial.

## Validação

1. Importar 1 CNJ de teste escolhendo cada credencial disponível e conferir `SELECT judit_system_name, judit_customer_key FROM processos_oab WHERE id=...`.
2. Logar como `danieldemorais.e@gmail.com`: abrir um processo, pausar monitoramento, ver botão "Editar credencial" aparecer, trocar para outra credencial, salvar.
3. Reativar monitoramento: conferir log do `judit-ativar-monitoramento` mostrando `customer_key` correto + `with_attachments: true`.
4. Logar com outro usuário no mesmo tenant: confirmar que o botão de editar **não aparece**.
5. Abrir `SuperAdminMonitoramento`: ver entrada `tracking_desativado` antigo + `tracking` novo com `metadata.system_name`.
6. Em 24h, conferir se `processo_andamentos_judit` recebe andamentos via webhook do tracking recém-criado em processo sigiloso.

## Confirmações antes de partir para implementação

1. Confirma o email `danieldemorais.e@gmail.com` como gate (exato, case-insensitive)?
2. Confirma que o select no modo em massa pode ser **único para o lote inteiro** (mais simples) — ou precisa por linha?