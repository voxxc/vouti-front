

# Corrigir seletor de Processo/Etapa no cadastro de prazo

## Problema

O seletor atual está rotulado "Processo / Caso" e puxa dados de `processos_oab` (que são **Casos judiciais**). O usuário quer selecionar **Protocolos** (fluxos internos da tabela `project_protocolos`) e depois suas **Etapas** (`project_protocolo_etapas`).

## Alterações em `AgendaContent.tsx`

### 1. Renomear e trocar a fonte de dados do seletor

- **State**: Renomear `availableProcessos` → `availableProtocolos` com tipo `{ id: string; nome: string; processo_oab_id?: string | null }`
- **State**: Renomear `selectedProcessoId` → `selectedProtocoloId`
- **Label**: "Protocolo (opcional)" em vez de "Processo / Caso (opcional)"

### 2. Carregar protocolos em vez de processos OAB

Quando um **Projeto** é selecionado:
```
project_protocolos WHERE project_id = projectId
```

Sem projeto selecionado (se tenant_id disponível):
```
project_protocolos WHERE tenant_id = tenantId
```

### 3. Cascata: Protocolo → Etapa

Ao selecionar um protocolo, buscar etapas diretamente:
```
project_protocolo_etapas WHERE protocolo_id = selectedProtocoloId ORDER BY ordem
```

Isso simplifica a lógica atual que buscava protocolos vinculados a um processo OAB.

### 4. Insert do deadline

- `protocolo_etapa_id`: continua sendo salvo (já existe)
- `processo_oab_id`: resolver automaticamente a partir do protocolo selecionado (se o protocolo tiver `processo_oab_id`), sem necessidade de seletor separado

### 5. Reset do formulário

Ajustar os resets para usar os novos nomes de estado.

### Arquivo alterado

- `src/components/Agenda/AgendaContent.tsx`

