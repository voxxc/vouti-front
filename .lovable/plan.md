## Causa raiz

A infraestrutura de vínculo (tabela `planejador_task_acordos`, hooks, triggers, snapshot e chat isolado) já está pronta no banco, mas **a UI ainda não foi construída**. Por isso você não acha o botão "Mostrar no Planejador" no card de dívida nem o campo "Acordos" dentro da tarefa do Planejador. Foi exatamente onde parei na última etapa, aguardando seu OK para mexer na interface.

## Correção (UI a implementar)

### 1) No card de dívida (setor Acordos do Projeto) — `TaskModal` quando `task_type='acordo'`
- Adicionar botão **"Mostrar no Planejador"** no header do modal.
- Ao clicar, abre um seletor que lista as **tarefas do Planejador** do tenant (busca por título) e permite vincular a uma ou mais.
- Mostra abaixo a lista de tarefas do Planejador já vinculadas àquela dívida (com botão desvincular — sem perder histórico, vai para `planejador_task_acordos_historico`).

### 2) Abas de ciclo de vida no setor Acordos — `AcordosView`
- Adicionar 3 abas: **Ativos** (default) · **Resolvidos** · **Deletados**.
- Filtra os cards pelo novo campo `arquivamento_status`.
- No card de dívida: menu com ações **"Marcar como resolvido"** / **"Mover para deletados"** / **"Restaurar para ativos"** (usa `setArquivamentoStatus` que já existe no hook).
- O kanban atual (Processos/Dívidas ↔ Acordos Feitos) continua igual, só com o filtro de aba por cima.

### 3) Na tarefa do Planejador — modal/drawer da tarefa
- Nova seção **"Acordos vinculados"** (multi-seleção): mostra dívidas vinculadas àquela tarefa, com nome do credor, valor, projeto/cliente e status (Ativo/Resolvido/Deletado em tag).
- Botão **"Vincular acordo"** abre seletor com busca em todos os acordos do tenant (apenas Ativos por padrão; opção para mostrar Resolvidos).
- Cada item linka direto para abrir o card da dívida no projeto.
- **Chat isolado por dívida**: quando um acordo está selecionado/expandido na tarefa, abre o `PlanejadorTaskChat` com `acordoTaskId` passado (a prop já existe).

## Arquivos afetados

- `src/components/Project/TaskModal.tsx` — botão "Mostrar no Planejador" + lista de tarefas vinculadas (apenas quando `task_type==='acordo'`).
- `src/components/Project/AcordosView.tsx` — abas Ativos/Resolvidos/Deletados + menu de ações de arquivamento.
- `src/components/Planejador/PlanejadorTaskModal.tsx` (ou drawer equivalente da tarefa) — seção "Acordos vinculados" + seletor + chat por acordo.
- 1 componente novo: `src/components/Planejador/AcordoLinkPicker.tsx` (seletor reutilizável).
- 1 componente novo: `src/components/Project/PlanejadorTaskPicker.tsx` (seletor inverso).
- Hooks já prontos em `src/hooks/usePlanejadorTaskAcordos.ts` — nada a alterar.

## Impacto

**UX / telas:**
- Card de dívida ganha botão "Mostrar no Planejador" e lista de tarefas vinculadas.
- Setor Acordos ganha 3 abas (Ativos / Resolvidos / Deletados) — visual muda, mas dívidas existentes ficam todas em "Ativos" por default.
- Tarefa do Planejador ganha campo "Acordos" + chat dedicado por dívida.

**Dados:**
- Nenhuma migration nova. Toda infra já está no banco (lifecycle, junção, histórico, snapshots).
- Nada fica órfão: desvincular grava em `planejador_task_acordos_historico`; mover dívida para "Deletados" arquiva os vínculos via trigger e restaura ao reativar; mensagens do chat guardam snapshot do título/valor/credor mesmo se a dívida for excluída.

**Riscos colaterais:**
- `TaskModal` é compartilhado entre todos os tipos de task — o botão "Mostrar no Planejador" será condicional a `task_type==='acordo'` para não poluir outras telas.
- `AcordosView` muda layout (abas) — usuários verão a UI mudar, mas dados ficam intactos.

**Quem é afetado:**
- Todos os usuários do módulo Projetos com setor Acordos e do Planejador (mesmo tenant).
- Não afeta Financeiro, CRM, WhatsApp ou outros módulos.

## Validação

1. Criar dívida no setor Acordos de um projeto → abrir card → clicar "Mostrar no Planejador" → escolher tarefa → confirmar aparece na tarefa.
2. Na tarefa do Planejador, abrir campo "Acordos" → vincular outra dívida → abrir chat isolado e enviar mensagem.
3. Mover dívida para "Resolvidos" → conferir aba e que o vínculo na tarefa mostra tag "Resolvido".
4. Mover dívida para "Deletados" → confirmar vínculo some da tarefa mas histórico permanece (consultar `planejador_task_acordos_historico`).
5. Restaurar dívida para "Ativos" → vínculo volta a aparecer na tarefa.
6. Excluir mensagem do chat após apagar dívida → snapshot de credor/valor continua legível.