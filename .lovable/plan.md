

## Corrigir navegacao de Setores/Acordos no Project Drawer

### Problema

Quando o projeto e aberto via drawer, clicar em "Acordos" ou qualquer setor no dropdown nao faz nada. Isso acontece porque `ProjectDrawerContent` renderiza `ProjectView` sem passar as props `onNavigateToAcordos` e `onProjectNavigation`. O fallback `() => {}` e executado (funcao vazia).

### Solucao

Adicionar gerenciamento de estado interno no `ProjectDrawerContent` para alternar entre as views: projeto principal, acordos e setor especifico. Quando o usuario clicar em "Acordos" ou em um setor, o drawer renderiza o componente correspondente (`AcordosView` ou `SectorView`) internamente, sem navegacao de rota.

### Mudancas tecnicas

**Arquivo**: `src/components/Project/ProjectDrawerContent.tsx`

1. Adicionar estado `drawerView` com tipo `'main' | 'acordos' | 'sector'` e `activeSectorId`
2. Passar `onNavigateToAcordos` para `ProjectView` que muda o estado para `'acordos'`
3. Passar `onProjectNavigation` para `ProjectView` que detecta se e navegacao de setor e muda o estado para `'sector'` com o sectorId
4. Renderizar condicionalmente:
   - `drawerView === 'main'` -> `ProjectView` (atual)
   - `drawerView === 'acordos'` -> `AcordosView` com `onBack` voltando para `'main'`
   - `drawerView === 'sector'` -> `SectorView` com `onBack` voltando para `'main'`
5. Importar `AcordosView` e `SectorView`

```text
// Novo estado
const [drawerView, setDrawerView] = useState<'main' | 'acordos' | 'sector'>('main');
const [activeSectorId, setActiveSectorId] = useState<string | null>(null);

// Handlers
const handleNavigateToAcordos = () => setDrawerView('acordos');

const handleProjectNavigation = (path: string) => {
  if (path.includes('/sector/')) {
    const sectorId = path.split('/sector/')[1];
    setActiveSectorId(sectorId);
    setDrawerView('sector');
  }
};

const handleBackToMain = () => {
  setDrawerView('main');
  setActiveSectorId(null);
};
```

Na renderizacao:
- `drawerView === 'main'`: `ProjectView` com `onNavigateToAcordos={handleNavigateToAcordos}` e `onProjectNavigation={handleProjectNavigation}`
- `drawerView === 'acordos'`: `AcordosView` com `onBack={handleBackToMain}` e o mesmo `project` e `handleUpdateProject`
- `drawerView === 'sector'`: `SectorView` com `onBack={handleBackToMain}`, o setor encontrado via `activeSectorId`, e o mesmo `project`

### Arquivos afetados

| Arquivo | Mudanca |
|---|---|
| `src/components/Project/ProjectDrawerContent.tsx` | Estado interno de view, renderizar AcordosView e SectorView, passar callbacks para ProjectView |

