
## Atualizar drawer de projetos apos criacao via CRM

### Problema

O evento `project-created` ja e emitido pelo `CRMDrawer` e o `ProjectQuickSearch` ja escuta esse evento para recarregar. Porem o `ProjectsDrawer` nao escuta esse evento, entao a lista de projetos no drawer nao atualiza automaticamente.

### Solucao

**`src/components/Projects/ProjectsDrawer.tsx`**

Adicionar um `useEffect` que escuta o evento `project-created` e chama `refetch` (exposto pelo `useProjectsOptimized`) apos 2 segundos de delay:

```text
const { projects, isBasicLoaded, createProject, refetch } = useProjectsOptimized();

useEffect(() => {
  const handler = () => {
    setTimeout(() => refetch(), 2000);
  };
  window.addEventListener('project-created', handler);
  return () => window.removeEventListener('project-created', handler);
}, [refetch]);
```

| Arquivo | Mudanca |
|---|---|
| `src/components/Projects/ProjectsDrawer.tsx` | Adicionar listener do evento `project-created` que chama `refetch` com delay de 2s |
