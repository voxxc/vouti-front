

## Abrir ProjectDrawer ao selecionar projeto no ProjectsDrawer

### Problema

Ao clicar em um projeto na lista do `ProjectsDrawer` (drawer lateral de projetos), o sistema navega para a pagina `/project/{id}`. O comportamento desejado e abrir o `ProjectDrawer` (drawer de detalhes do projeto) lateralmente, igual ao que ja acontece na busca rapida.

### Solucao

A infraestrutura ja existe no `DashboardLayout`: o `handleQuickProjectSelect` ja faz exatamente isso (seta o `selectedProjectId` e abre o `projectDrawerOpen`). Basta passar um callback para o `ProjectsDrawer` para que ele use essa mesma logica em vez de navegar.

### Mudancas

**1. `src/components/Projects/ProjectsDrawer.tsx`**

- Adicionar prop `onSelectProject?: (projectId: string) => void`
- No `handleSelectProject`, se `onSelectProject` existir, chamar ele em vez de `navigate`
- NAO fechar o drawer de projetos ao selecionar (o ProjectDrawer abrira por cima)

**2. `src/components/Dashboard/DashboardLayout.tsx`**

- Passar `onSelectProject={handleQuickProjectSelect}` para o `ProjectsDrawer`

Isso reutiliza toda a logica existente do `ProjectDrawer` que ja funciona perfeitamente com a busca rapida.

### Detalhes tecnicos

No `ProjectsDrawer.tsx`, a funcao `handleSelectProject` muda de:
```text
const handleSelectProject = (project) => {
  navigate(`/project/${project.id}`);
  onOpenChange(false);
};
```
Para:
```text
const handleSelectProject = (project) => {
  if (onSelectProject) {
    onSelectProject(project.id);
  } else {
    navigate(`/project/${project.id}`);
    onOpenChange(false);
  }
};
```

| Arquivo | Mudanca |
|---|---|
| `src/components/Projects/ProjectsDrawer.tsx` | Adicionar prop `onSelectProject` e usar no click |
| `src/components/Dashboard/DashboardLayout.tsx` | Passar `onSelectProject={handleQuickProjectSelect}` ao ProjectsDrawer |

