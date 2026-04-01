

## Plano: Exibir Protocolos/Processos como cards no Planejador (apenas para danieldemorais.e@gmail.com no Solvenza)

### O que será feito

Adicionar todos os protocolos (`project_protocolos`) do tenant como cards no Kanban do Planejador, organizados nas colunas por data (usando `data_previsao` como prazo). Essa funcionalidade será habilitada **apenas** para o usuário `danieldemorais.e@gmail.com`.

### Arquivos a editar

**1. `src/hooks/usePlanejadorTasks.ts`**
- Adicionar campos opcionais ao `PlanejadorTask`: `is_protocolo`, `protocolo_project_name`, `protocolo_workspace_name`
- No `queryFn`, após buscar tasks e subtasks, verificar se o email do usuário é `danieldemorais.e@gmail.com`
- Se sim, buscar todos os `project_protocolos` do tenant com JOIN em `projects(name)` e `project_workspaces(nome)`
- Converter cada protocolo em um `PlanejadorTask`:
  - `titulo` = protocolo `nome`
  - `prazo` = `data_previsao`
  - `status` = `data_conclusao ? 'completed' : status` (mapear para pending/completed)
  - `is_protocolo = true`
  - Demais campos preenchidos com defaults
- Incluir esses "pseudo-tasks" no array retornado

**2. `src/components/Planejador/PlanejadorTaskCard.tsx`**
- Adicionar indicador visual para protocolos (ícone `FileText` em azul, similar ao `Flag` das subtasks)
- Mostrar nome do projeto abaixo do título (similar ao `parent_task_titulo` das subtasks)

**3. `src/components/Planejador/PlanejadorDrawer.tsx`**
- Buscar o email do usuário logado (já tem `user` do `useAuth`)
- Passar flag `includeProtocolos` para o hook se email === `danieldemorais.e@gmail.com`
- Ao clicar num card de protocolo, navegar para o projeto/protocolo em vez de abrir `PlanejadorTaskDetail`

### Detalhes técnicos

- A query de protocolos usará: `supabase.from('project_protocolos').select('*, projects(name), project_workspaces(nome)').eq('tenant_id', tenantId)`
- Protocolos com `status = 'concluido'` ou `data_conclusao != null` → coluna "Concluído"
- Protocolos com `data_previsao` → categorizados pela mesma lógica de datas das tasks
- Protocolos sem `data_previsao` → coluna "Sem prazo"
- Protocolos são **read-only** no Kanban (não podem ser arrastados/movidos)
- O check de email será feito no hook usando `user.email`

### Comportamento esperado
- Cards de protocolo aparecerão misturados com as tarefas normais no Kanban
- Visualmente diferenciados com ícone azul de documento e nome do projeto
- Ao clicar, abre o projeto na aba do protocolo (navegação)
- Drag-and-drop desabilitado para cards de protocolo

