

## Plano: Filtrar Protocolos por Workspace selecionado no EditarPrazoDialog

### Problema
Ao editar um prazo, quando o usuário seleciona um Workspace, o seletor de Protocolo continua mostrando **todos** os protocolos do projeto, em vez de apenas os daquele workspace.

### Solução

**Arquivo**: `src/components/Agenda/EditarPrazoDialog.tsx`

1. **Ao mudar o Workspace** (`onValueChange` do Select de Workspace, linha 512): disparar uma nova consulta que filtra protocolos por `workspace_id`, resetando protocolo e etapa selecionados.

2. **No `handleProjectChange`** (linhas 184-198): quando carrega protocolos do projeto, não filtrar por workspace ainda (pois workspace ainda não foi selecionado).

3. **Nova função `handleWorkspaceChange`**: substitui o `onValueChange` inline do workspace (linha 512):
   ```ts
   const handleWorkspaceChange = async (val: string) => {
     const wsId = val === 'default' ? '' : val;
     setSelectedWorkspaceId(wsId);
     setSelectedProtocoloId('');
     setSelectedEtapaId('');
     setAvailableEtapas([]);

     if (selectedProjectId) {
       const query = supabase
         .from('project_protocolos')
         .select('id, nome, processo_oab_id')
         .eq('project_id', selectedProjectId)
         .order('nome');

       if (wsId) {
         query.eq('workspace_id', wsId);
       }

       const { data } = await query;
       setAvailableProtocolos(data || []);
     }
   };
   ```

4. **No `initCascade`** (linhas 126-151): ao carregar protocolos iniciais, se já existe um `workspaceId` no deadline, filtrar por ele.

5. **No `handleProjectChange`**: ao carregar protocolos após trocar projeto, se `selectedWorkspaceId` estiver definido, filtrar por ele também.

### Resultado
Workspace → Protocolo → Etapa será uma cascata real: selecionar workspace filtra os protocolos disponíveis, que por sua vez filtra as etapas.

