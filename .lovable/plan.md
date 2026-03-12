

# Completar detalhes na aba Subtarefas + Remover seletor de responsável na subtarefa

## Duas alterações

### 1. Remover "Atribuir para" da criação de subtarefa (`AgendaContent.tsx`)

- Remover o campo `AdvogadoSelector` do bloco de criação de subtarefa (linhas 1690-1696)
- Remover o state `subtarefaUsuario` e suas referências
- Remover a validação `!subtarefaUsuario` do `disabled` do botão (linha 1705)
- No insert da subtarefa, não enviar `atribuido_a` (ou enviar null)

### 2. Completar o modal de detalhes na aba Subtarefas (`CentralSubtarefas.tsx`)

**Query**: Adicionar `workspace_id` e `processo_oab_id` ao select de deadlines.

**Fetch extra** (batch após query principal):
- Nomes dos workspaces via `project_workspaces` (ids coletados dos resultados)
- Info dos processos via `processos_oab` (`numero_cnj`, `parte_ativa`, `parte_passiva`)

**Interface**: Adicionar ao tipo `PrazoConcluido`:
- `workspace_id`, `processo_oab_id`
- `workspaceName?`, `processoInfo?`

**Modal**: Adicionar entre "Projeto" e "Responsável":
- **Workspace** (se existir)
- **Processo / Caso** com número CNJ e partes (se existir)
- **Protocolo Vinculado** — protocolo + etapa (já existe na query, falta exibir no modal)
- **Criado por** — já mapeado como `criador_profile`, falta exibir no modal

### Arquivos alterados

- `src/components/Agenda/AgendaContent.tsx` — remover seletor de responsável na subtarefa
- `src/components/Controladoria/CentralSubtarefas.tsx` — query, fetch, interface e modal completo

