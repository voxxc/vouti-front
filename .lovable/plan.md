
# Acesso Rápido a Projetos via Drawer

## Resumo
Modificar o comportamento do buscador rápido de projetos (ProjectQuickSearch) no topbar para abrir o projeto selecionado em um drawer lateral (da direita para a esquerda), ao invés de navegar para a página completa. O drawer terá o mesmo visual do workspace já existente, proporcionando acesso instantâneo aos projetos.

---

## Arquitetura da Solução

### Situacao Atual
```text
[ProjectQuickSearch] 
       |
       v (navigate)
[/project/:id] --> [ProjectViewWrapper] --> [ProjectView com DashboardLayout]
```

### Nova Arquitetura
```text
[ProjectQuickSearch]
       |
       v (callback onSelectProject)
[DashboardLayout]
       |
       v (estado projectDrawerOpen + selectedProjectId)
[ProjectDrawer] --> [ProjectDrawerContent (sem DashboardLayout)]
```

---

## Arquivos a Criar/Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/components/Project/ProjectDrawer.tsx` | NOVO | Drawer container usando Sheet side="inset" |
| `src/components/Project/ProjectDrawerContent.tsx` | NOVO | Conteudo do projeto adaptado para drawer |
| `src/components/Search/ProjectQuickSearch.tsx` | MODIFICAR | Adicionar callback onSelectProject |
| `src/components/Dashboard/DashboardLayout.tsx` | MODIFICAR | Gerenciar estado do ProjectDrawer |
| `src/components/Dashboard/DashboardSidebar.tsx` | MODIFICAR | Incluir ProjectDrawer |

---

## Detalhamento Tecnico

### 1. ProjectDrawer.tsx

```text
Estrutura do Drawer:
+-------------------------------------------------------------------+
| [ArrowLeft] Voltar    Nome do Projeto                         [X] |
|                       Cliente                                     |
+-------------------------------------------------------------------+
| [Workspace Tabs: Principal | Aba 2 | ...]                         |
+-------------------------------------------------------------------+
| [Processos] [Casos] [Colunas]    [Participantes] [Lock] [Setores] |
+-------------------------------------------------------------------+
|                                                                   |
|  Conteudo scrollavel com:                                        |
|  - ProjectProtocolosList (aba Processos)                         |
|  - ProjectProcessos (aba Casos)                                   |
|  - Kanban Board (aba Colunas)                                     |
|                                                                   |
+-------------------------------------------------------------------+
```

Props do componente:
```typescript
interface ProjectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
}
```

### 2. ProjectDrawerContent.tsx

Este componente sera uma versao adaptada do ProjectView SEM o DashboardLayout wrapper. Contera:

- Header com nome do projeto editavel e botao voltar
- WorkspaceTabs 
- Tabs de navegacao (Processos, Casos, Colunas)
- Conteudo de cada aba
- Modais (TaskModal, CreateSectorDialog, etc.)

### 3. ProjectQuickSearch.tsx - Modificacoes

Adicionar prop callback para comunicar selecao ao parent:

```typescript
interface ProjectQuickSearchProps {
  tenantPath: (path: string) => string;
  onSelectProject?: (projectId: string) => void; // NOVO
}

// No handleSelect:
const handleSelect = (projectId: string) => {
  if (onSelectProject) {
    onSelectProject(projectId); // Abre drawer
  } else {
    navigate(tenantPath(`project/${projectId}`)); // Fallback
  }
  setSearchTerm('');
  setOpen(false);
};
```

### 4. DashboardLayout.tsx - Modificacoes

Gerenciar estado do drawer de projeto:

```typescript
// Estado
const [projectDrawerOpen, setProjectDrawerOpen] = useState(false);
const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

// Handler
const handleQuickProjectSelect = (projectId: string) => {
  setSelectedProjectId(projectId);
  setProjectDrawerOpen(true);
};

// No render:
<ProjectQuickSearch 
  tenantPath={tenantPath} 
  onSelectProject={handleQuickProjectSelect} 
/>

<ProjectDrawer 
  open={projectDrawerOpen}
  onOpenChange={setProjectDrawerOpen}
  projectId={selectedProjectId}
/>
```

---

## Comportamento do Drawer

1. **Side**: `inset` - ocupa area principal (direita para esquerda), mesmo comportamento da Controladoria
2. **Modal**: `false` - sidebar permanece interativa
3. **Carregamento**: Busca dados do projeto ao abrir (similar ao ProjectViewWrapper)
4. **Navegacao interna**: Manter tabs e workspace navigation funcionando dentro do drawer
5. **Fechar**: Botao X ou clicar em outro item da sidebar

---

## Fluxo do Usuario

1. Usuario digita no campo de busca rapida
2. Dropdown mostra projetos filtrados
3. Usuario clica em um projeto
4. Drawer abre instantaneamente da direita para esquerda
5. Projeto carrega com skeleton/loading
6. Usuario interage normalmente (trocar workspace, ver processos, etc.)
7. Usuario pode fechar clicando no X ou abrindo outro drawer da sidebar

---

## Reutilizacao de Codigo

Para evitar duplicacao, o `ProjectDrawerContent` vai:

1. **Reutilizar hooks existentes**:
   - `useProjectWorkspaces`
   - `useToast`
   - `useAuth`

2. **Reutilizar componentes existentes**:
   - `ProjectWorkspaceTabs`
   - `ProjectProtocolosList`
   - `ProjectProcessos`
   - `KanbanColumn`, `TaskCard` (para aba Colunas)
   - `TaskModal`, `CreateSectorDialog`, etc.
   - `EditableProjectName`
   - `SetoresDropdown`

3. **Extrair logica comum** do ProjectView em funcoes reutilizaveis quando possivel

---

## Consideracoes de Performance

- Carregar dados apenas quando drawer abre (lazy loading)
- Manter cache de projetos recentemente abertos
- Usar skeleton loaders durante carregamento
- Subscriptions Supabase apenas enquanto drawer aberto

---

## Compatibilidade

- O comportamento existente de navegacao completa (`/project/:id`) permanece funcional
- Usuarios podem acessar via:
  - Busca rapida no topbar -> Drawer
  - ProjectsDrawer (sidebar) -> Pagina completa
  - URL direta -> Pagina completa

