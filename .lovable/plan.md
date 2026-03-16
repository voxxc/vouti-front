

# Adicionar seletores de Projeto, Workspace, Protocolo e Etapa ao EditarPrazoDialog

## Problema atual

O dialog de edição de prazo (`EditarPrazoDialog`) só permite editar título, descrição, data, responsável e tags. Os campos de rastreabilidade (Projeto, Workspace, Protocolo, Etapa) só estão disponíveis na criação.

## Solução

### 1. Expandir a interface `Deadline` do EditarPrazoDialog

Adicionar os campos necessários: `projectId`, `projectName`, `workspaceId`, `protocoloEtapaId` para que o dialog receba os dados atuais do prazo.

### 2. Modificar `EditarPrazoDialog.tsx`

Adicionar os mesmos seletores em cascata que existem no dialog de criação em `AgendaContent`:

- **Projeto** (Select com lista de projetos do tenant)
- **Workspace** (Select condicional, aparece quando o projeto tem mais de 1 workspace)
- **Protocolo** (Select, filtra por projeto se selecionado, senão mostra todos do tenant)
- **Etapa** (Select condicional, aparece quando um protocolo é selecionado)

A lógica de cascata será idêntica à da criação:
- Ao mudar projeto -> recarregar workspaces e protocolos
- Ao mudar protocolo -> recarregar etapas
- Campos pré-populados com os valores atuais do prazo

No `handleSave`, incluir os novos campos no update:
```typescript
project_id: selectedProjectId || null,
workspace_id: resolvedWorkspaceId,
protocolo_etapa_id: selectedEtapaId || null,
processo_oab_id: protocoloProcessoOabId || null
```

Registrar alterações de projeto/protocolo no comentário de auditoria.

### 3. Ajustar `AgendaContent.tsx`

Passar os dados adicionais ao `editDeadline` para que o dialog consiga pré-popular. A raw data do deadline já contém `project_id`, `workspace_id`, `protocolo_etapa_id` — basta expor na interface.

Expandir o estado do `editDeadline` para incluir esses campos na interface local.

### 4. Expandir a interface `Deadline` em `types/agenda.ts`

Adicionar campos opcionais `workspaceId` e `protocoloEtapaId` para transporte.

### Arquivos a modificar
- `src/components/Agenda/EditarPrazoDialog.tsx` — adicionar seletores e lógica de cascata
- `src/components/Agenda/AgendaContent.tsx` — passar dados extras ao editDeadline
- `src/types/agenda.ts` — adicionar `workspaceId` e `protocoloEtapaId`

