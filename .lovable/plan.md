

# Adicionar seletores de Processo (OAB) e Etapa na criação de prazo pela Agenda

## O que existe hoje

O diálogo "Criar Novo Prazo" na Agenda já possui: Título, Descrição, Responsável, Tags, Projeto (opcional) e Workspace (opcional). Faltam os campos de **Processo (Caso OAB)** e **Etapa (do protocolo)** para rastreabilidade completa.

## O que será feito

### Novos campos no diálogo de criação (AgendaContent.tsx)

Após o seletor de Workspace, adicionar dois novos campos encadeados:

1. **Processo / Caso (opcional)** — `Select` que lista os processos OAB vinculados ao projeto selecionado (via `project_processos` → `processos_oab`). Se nenhum projeto for selecionado, lista todos os processos do tenant. Salva em `processo_oab_id` na tabela `deadlines`.

2. **Etapa (opcional)** — `Select` que lista as etapas dos protocolos vinculados ao processo selecionado (via `project_protocolos` → `project_protocolo_etapas`). Aparece somente se um processo estiver selecionado. Salva em `protocolo_etapa_id` na tabela `deadlines`.

### Fluxo de cascata

- Selecionar **Projeto** → carrega Workspaces + Processos do projeto
- Selecionar **Processo** → carrega Etapas (via protocolos vinculados)
- Limpar Projeto → limpa Workspace, Processo e Etapa
- Limpar Processo → limpa Etapa

### Alterações no insert

O `handleCreateDeadline` passará a incluir:
- `processo_oab_id: selectedProcessoId || null`
- `protocolo_etapa_id: selectedEtapaId || null`

### Alterações no formData reset

Após criação, limpar os novos estados.

### Novos estados

- `availableProcessos` — lista de processos carregados
- `selectedProcessoId` — processo selecionado
- `availableEtapas` — lista de etapas carregadas
- `selectedEtapaId` — etapa selecionada

### Tipo DeadlineFormData (src/types/agenda.ts)

Adicionar campos opcionais `processoOabId` e `protocoloEtapaId`.

### Arquivo alterado

- `src/components/Agenda/AgendaContent.tsx` — estados, UI do diálogo, lógica de insert
- `src/types/agenda.ts` — campos opcionais no DeadlineFormData

