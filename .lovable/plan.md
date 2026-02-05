
# Drawer Lateral de Projetos (Esquerda → Direita)

## Conceito

Substituir a navegação para página `/projects` por um **drawer lateral** que abre instantaneamente ao clicar no botão "Projetos" na sidebar. Os dados são carregados em background enquanto o drawer já está visível.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [SIDEBAR]  │                     CONTEÚDO ATUAL                                 │
│            │                                                                    │
│  Dashboard │  ┌──────────────────────────┐                                      │
│  Projetos ◄├──│   📁 PROJETOS            │──────────────────────────────────────│
│  Agenda    │  │   [+ Novo Projeto]       │                                      │
│  Clientes  │  │                          │                                      │
│  ...       │  │   🔍 Buscar...           │                                      │
│            │  │                          │                                      │
│            │  │   ┌──────────────────┐   │                                      │
│            │  │   │ Projeto A        │   │                                      │
│            │  │   │ Cliente X • 5 ▢  │   │                                      │
│            │  │   └──────────────────┘   │                                      │
│            │  │   ┌──────────────────┐   │                                      │
│            │  │   │ Projeto B        │   │                                      │
│            │  │   │ Cliente Y • 12 ▢ │   │                                      │
│            │  │   └──────────────────┘   │                                      │
│            │  │          ...             │                                      │
│            │  └──────────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Vantagens desta Abordagem

| Problema Atual | Solução com Drawer |
|----------------|-------------------|
| Navegação lenta (carrega página inteira) | Drawer abre instantaneamente, dados carregam em paralelo |
| Sensação de vazio durante loading | Skeleton loaders dentro do drawer, contexto atual visível |
| Perda de contexto ao navegar | Página atual permanece visível atrás do drawer |
| Precisa voltar ao Dashboard após ver projetos | Basta fechar o drawer, continua onde estava |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/Projects/ProjectsDrawer.tsx` | **CRIAR** | Novo drawer lateral com lista de projetos |
| `src/components/Dashboard/DashboardSidebar.tsx` | **MODIFICAR** | Botão "Projetos" abre drawer ao invés de navegar |
| `src/hooks/useProjectsOptimized.ts` | **MODIFICAR** | Adicionar atualização otimista |

---

## Estrutura do ProjectsDrawer

```text
┌─────────────────────────────────────┐
│  ← 📁 PROJETOS                      │ ← Header
├─────────────────────────────────────┤
│  [+ Novo Projeto]                   │ ← Botão criar
├─────────────────────────────────────┤
│  🔍 Buscar projetos...              │ ← Campo busca
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 📂 Projeto Alpha              │  │
│  │    Cliente ABC • 5 tarefas    │  │
│  │    ████████░░ 80%             │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │ ← Lista scrollável
│  │ 📂 Projeto Beta               │  │
│  │    Cliente XYZ • 12 tarefas   │  │
│  │    ██████░░░░ 60%             │  │
│  └───────────────────────────────┘  │
│  ...                                │
└─────────────────────────────────────┘
```

---

## Detalhes de Implementação

### 1. ProjectsDrawer.tsx (NOVO COMPONENTE)

```typescript
interface ProjectsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectsDrawer({ open, onOpenChange }: ProjectsDrawerProps) {
  const { navigate } = useTenantNavigation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const {
    projects,
    isBasicLoaded,
    isDetailsLoaded,
    getProjectStats,
    createProject
  } = useProjectsOptimized();

  // Filtrar projetos pela busca
  const filteredProjects = projects.filter(...);

  // Ao clicar em um projeto, navega e fecha drawer
  const handleSelectProject = (project) => {
    navigate(`project/${project.id}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[400px] p-0">
        {/* Header */}
        <SheetHeader>...</SheetHeader>
        
        {/* Criar Projeto */}
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus /> Novo Projeto
        </Button>
        
        {/* Busca */}
        <Input placeholder="Buscar projetos..." />
        
        {/* Lista de Projetos */}
        <ScrollArea>
          {isBasicLoaded ? (
            filteredProjects.map(project => (
              <ProjectItem 
                project={project}
                stats={getProjectStats(project.id)}
                onClick={handleSelectProject}
              />
            ))
          ) : (
            <SkeletonLoaders />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### 2. Modificação no DashboardSidebar.tsx

```typescript
const DashboardSidebar = ({ currentPage }: DashboardSidebarProps) => {
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
  
  // No item "Projetos", ao invés de navegar:
  {menuItems.map((item) => {
    // Tratamento especial para Projetos
    if (item.id === 'projetos') {
      return (
        <Button
          key={item.id}
          onClick={() => setProjectsDrawerOpen(true)} // Abre drawer
          // ...resto das props
        >
          <FolderOpen />
          {!isCollapsed && <span>Projetos</span>}
        </Button>
      );
    }
    // Outros itens navegam normalmente
    return (...);
  })}
  
  {/* Drawer de Projetos */}
  <ProjectsDrawer 
    open={projectsDrawerOpen} 
    onOpenChange={setProjectsDrawerOpen} 
  />
};
```

### 3. Atualização Otimista no useProjectsOptimized

```typescript
// Na função createProject:
const createProject = async (data) => {
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({...})
    .select()
    .single();

  if (!error) {
    // OTIMISTA: Adiciona imediatamente ao estado
    const projectBasic = { ...mapToBasic(newProject), taskCount: 0 };
    setProjects(prev => 
      [...prev, projectBasic].sort((a, b) => a.name.localeCompare(b.name))
    );
  }
  return newProject;
};
```

---

## Fluxo de Interação

```text
1. Usuário clica "Projetos" na sidebar
           │
           ▼
2. Drawer abre INSTANTANEAMENTE (da esquerda)
   com skeleton loaders
           │
           ▼
3. Hook useProjectsOptimized carrega dados
   (já pode estar cacheado pelo React Query)
           │
           ▼
4. Lista de projetos aparece
           │
           ▼
5. Usuário pode:
   ├─ Buscar projetos
   ├─ Clicar para abrir um projeto → navega + fecha drawer
   └─ Criar novo projeto → formulário inline + atualização otimista
```

---

## Benefícios do side="left"

O drawer abrindo da **esquerda para a direita** faz sentido porque:
- Fica próximo ao botão que foi clicado na sidebar (continuidade visual)
- Não sobrepõe o conteúdo principal à direita
- Pattern usado em apps de navegação lateral (Gmail, Slack)

---

## Form de Criação Inline

Quando clicar em "Novo Projeto", exibir formulário compacto dentro do drawer:

```text
┌─────────────────────────────────────┐
│  ← 📁 PROJETOS                      │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ NOVO PROJETO                  │  │
│  │ Nome: [________________]      │  │
│  │ Cliente: [_______________]    │  │
│  │ Descrição: [_____________]    │  │
│  │ [Criar] [Cancelar]            │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  🔍 Buscar projetos...              │
│  ...                                │
```

---

## Resumo das Alterações

| Etapa | Descrição |
|-------|-----------|
| 1 | Criar `ProjectsDrawer.tsx` com Sheet side="left" |
| 2 | Implementar lista de projetos com busca e skeleton |
| 3 | Adicionar formulário de criação inline |
| 4 | Modificar `DashboardSidebar` para abrir drawer |
| 5 | Adicionar atualização otimista no hook |
| 6 | Manter página `/projects` como fallback (link "Ver todos") |

O resultado: clicar em "Projetos" abre instantaneamente um drawer fluido, sem sensação de vazio ou necessidade de recarregar a página.
