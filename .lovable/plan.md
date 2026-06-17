## Causa raiz / Motivação
No setor "Acordos" do Projeto você cadastra **dívidas do cliente com terceiros** (acompanhamento, não financeiro do escritório). Quer espelhar essas dívidas dentro de tarefas do Planejador, com chat isolado por dívida e **sem perda de dados** em nenhum ciclo de vida (resolver, deletar, desvincular).

## Correção (proposta funcional)

### 1. Vínculo N:N (múltiplas dívidas por tarefa, múltiplas tarefas por dívida)
Nova tabela `planejador_task_acordos`:
- `planejador_task_id` → `planejador_tasks.id` (ON DELETE CASCADE — se a tarefa some, vínculo some, mas a dívida permanece no Projeto)
- `cliente_divida_id` → `cliente_dividas.id` (ON DELETE RESTRICT — não deixa a dívida ser deletada com vínculo ativo; força ir para aba "Deletados" primeiro)
- `tenant_id`, `created_by`, `created_at`
- UNIQUE(planejador_task_id, cliente_divida_id)

### 2. Origem do vínculo: a partir da dívida (Projeto → Planejador)
- No card da dívida, dentro do setor Acordos, botão **"Vincular tarefa do Planejador"**.
- Modal busca tarefas do Planejador do tenant (filtros: minhas/todas, status, texto).
- Selecionar uma ou mais tarefas → vínculos criados.
- Lista de tarefas vinculadas aparece no próprio card da dívida com botão "Desvincular" por linha.

### 3. Aparição condicional no Planejador
- Aba/seção **"Acordos"** dentro do `PlanejadorTaskDetail` aparece **apenas quando há ao menos um vínculo** (regra confirmada).
- Lista: credor, cliente, valor, status do acordo, projeto de origem, link "Abrir no Projeto", botão "Chat do acordo", botão "Desvincular".
- Desvincular aqui apenas remove a linha de `planejador_task_acordos` — a dívida e o histórico do chat permanecem intactos.

### 4. Chat isolado por dívida (sem órfãos)
- `planejador_task_messages` ganha coluna nullable `cliente_divida_id` (FK `cliente_dividas.id` ON DELETE SET NULL como rede de segurança, mas o fluxo normal nunca dispara isso — veja item 5).
- Filtros: `cliente_divida_id IS NULL` = chat geral da tarefa; `= X` = thread daquela dívida.
- Reaproveita realtime, uploads, menções existentes.

### 5. Ciclo de vida das dívidas no setor Acordos (sem perda)
Adicionar coluna `arquivamento_status` em `cliente_dividas` com valores:
- `ativa` (padrão) — aparece nas listas normais e no Planejador.
- `resolvida` — sai das listas ativas, vai para aba **"Resolvidos"** do setor Acordos. Continua vinculada às tarefas do Planejador (aparece com badge "Resolvida"). Chat preservado.
- `deletada` — sai das listas ativas, vai para aba **"Deletados"** do setor Acordos. Sai automaticamente das tarefas do Planejador (vínculos removidos, mas **mensagens do chat são preservadas** com snapshot dos metadados — veja item 6). Pode ser restaurada para `ativa`.

Nada é apagado fisicamente em nenhum momento. "Excluir definitivamente" não existe nessa fase.

### 6. Snapshot anti-órfão no chat
Para garantir que nenhuma mensagem fique sem contexto se a dívida for movida para "Deletados":
- `planejador_task_messages` ganha colunas snapshot opcionais: `divida_titulo_snapshot`, `divida_valor_snapshot`, `divida_credor_snapshot` — preenchidas por trigger no primeiro INSERT com `cliente_divida_id`.
- Trigger ao mover dívida para `arquivamento_status='deletada'`:
  - Move o vínculo para tabela `planejador_task_acordos_historico` (mesmas colunas + `removed_at`, `removed_reason`).
  - Remove de `planejador_task_acordos` ativos.
  - Mensagens mantêm `cliente_divida_id` apontando para a dívida (que continua existindo na aba Deletados), então o chat continua acessível pela aba Deletados do Projeto.
- Restaurar dívida para `ativa` ou `resolvida` → migra vínculos de volta do histórico.

### 7. Sem integração financeira
Nenhum trigger toca parcelas, valores, status financeiros. Puramente organização.

## Arquivos afetados

**Migrações (Supabase)**
- `cliente_dividas`: adicionar `arquivamento_status TEXT NOT NULL DEFAULT 'ativa' CHECK IN ('ativa','resolvida','deletada')`, `arquivamento_at TIMESTAMPTZ`, `arquivamento_por UUID`.
- `planejador_task_acordos` (nova) + GRANTs + RLS por tenant + dono/colaboradores.
- `planejador_task_acordos_historico` (nova) — espelho com `removed_at`, `removed_reason`.
- `planejador_task_messages`: colunas `cliente_divida_id`, `divida_titulo_snapshot`, `divida_valor_snapshot`, `divida_credor_snapshot` + índice composto `(planejador_task_id, cliente_divida_id, created_at)`.
- Trigger `BEFORE INSERT` em `planejador_task_messages` para preencher snapshot quando `cliente_divida_id` vier setado.
- Trigger `AFTER UPDATE` em `cliente_dividas` para mover vínculos entre tabela ativa e histórico conforme `arquivamento_status`.
- RLS: novas tabelas escopadas por `tenant_id` + `has_role_in_tenant()`.

**Frontend novo**
- `src/hooks/usePlanejadorTaskAcordos.ts` — CRUD vínculos + realtime.
- `src/hooks/useDividaTarefasVinculadas.ts` — lista tarefas vinculadas a uma dívida.
- `src/components/Planejador/PlanejadorTaskAcordosTab.tsx` — aba condicional no detalhe da tarefa.
- `src/components/Planejador/PlanejadorAcordoChatPanel.tsx` — Sheet com chat filtrado por `cliente_divida_id`.
- `src/components/Project/AcordoVincularTaskDialog.tsx` — modal de busca/seleção de tarefas a partir da dívida.
- `src/components/Project/AcordoArquivamentoTabs.tsx` — abas "Ativos / Resolvidos / Deletados" no setor Acordos.

**Frontend alterado**
- Componente do card de dívida no setor Acordos: ações "Vincular tarefa", "Marcar como resolvida", "Mover para Deletados", "Restaurar".
- `PlanejadorTaskDetail`: renderizar aba "Acordos" se `acordos.length > 0`.
- Hook de mensagens do Planejador: aceitar filtro opcional `cliente_divida_id`.

## Impacto

**1. UX / usuário final**
- O setor Acordos ganha 3 abas: **Ativos / Resolvidos / Deletados**, com ações de transição claras e reversíveis.
- O Planejador só mostra "Acordos" em tarefas que foram explicitamente vinculadas via dívida — UI limpa para quem não usa.
- Cada dívida tem chat próprio dentro da tarefa, separado do chat geral; sem mistura.
- Nada some: resolver ou deletar é mover de aba, não apagar.

**2. Dados**
- 2 tabelas novas pequenas + 4 colunas novas em existentes + 2 triggers leves.
- Histórico de vínculos preservado em `planejador_task_acordos_historico`.
- Snapshot no chat garante leitura mesmo se a dívida for deletada (defesa em profundidade — o fluxo normal já preserva via aba Deletados).
- Índices adicionais cobrem filtros de listagem e thread de chat.

**3. Riscos colaterais**
- Excluir tarefa do Planejador → CASCADE remove vínculos da tarefa, mas a dívida e suas mensagens continuam acessíveis pelo Projeto. *Decisão sugerida: também copiar o vínculo para `_historico` com `removed_reason='task_deleted'` antes do CASCADE, via trigger BEFORE DELETE.*
- Tentar deletar uma `cliente_divida` no SQL diretamente: bloqueado por RESTRICT enquanto houver vínculo ativo — força o fluxo correto (mover para "Deletados" primeiro).
- Performance: índices novos cobrem queries principais; tabela histórico cresce monotônica, mas com volume baixo.
- Menções/notificações no chat do acordo: deep link precisa carregar `?divida=<id>` para abrir o Sheet certo.

**4. Quem é afetado**
- Usuários que usam o setor Acordos de Projetos + Planejador. Não toca Financeiro do escritório, Agenda, Controladoria, WhatsApp.
- RLS multi-tenant em todas as novas tabelas. Permissões: dono da tarefa, colaboradores do projeto da dívida, admin/controller/financeiro do tenant.

## Validação
1. Setor Acordos: criar dívida → aparece em "Ativos" → botão "Vincular tarefa" → escolher tarefas → vínculo criado.
2. Abrir tarefa vinculada no Planejador → aba "Acordos" aparece → linha com dados da dívida.
3. Clicar "Chat do acordo" → Sheet abre → enviar mensagem → realtime entrega → chat geral da tarefa segue sem essas mensagens.
4. Tarefa sem vínculo → aba "Acordos" **não** aparece.
5. Marcar dívida como **"Resolvida"** → sai de "Ativos", vai para "Resolvidos" → tarefa ainda mostra com badge "Resolvida" → chat continua acessível.
6. Mover dívida para **"Deletados"** → some das tarefas no Planejador, vínculos vão para `_historico`, chat ainda acessível pela aba Deletados do Projeto, snapshot garante metadados.
7. Restaurar dívida para "Ativos" → vínculos voltam do histórico → aba "Acordos" reaparece nas tarefas originais.
8. Excluir tarefa do Planejador → vínculo vai para histórico com `removed_reason='task_deleted'`, dívida e chat permanecem no Projeto.
9. Tentar deletar dívida fisicamente via SQL → bloqueado (RESTRICT).