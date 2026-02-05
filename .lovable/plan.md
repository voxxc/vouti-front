
# Drawer Full-Screen para Clientes, Financeiro e Reunioes

## Objetivo

Criar drawers "quase fullscreen" para **Clientes**, **Financeiro**, **Reunioes** e ajustar o drawer existente de **Controladoria** e **Projetos** - todos posicionados de forma que respeitem a barra lateral e a barra superior, ocupando apenas o espaco de conteudo principal.

## Conceito Visual

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        BARRA SUPERIOR (Header)                                     │
├──────────┬────────────────────────────────────────────────────────────────────────┤
│          │                                                                    [X] │
│ SIDEBAR  │                    DRAWER "QUASE FULLSCREEN"                           │
│          │                                                                        │
│ Dashboard│     Conteudo da pagina (Clientes/Financeiro/Reunioes)                  │
│ Projetos │                                                                        │
│ Agenda   │     - Metricas                                                         │
│ Clientes │     - Tabs                                                             │
│ Financ.  │     - Listagens                                                        │
│ Control. │     - Acoes                                                            │
│ Reunioes │                                                                        │
│          │                                                                        │
└──────────┴────────────────────────────────────────────────────────────────────────┘
```

O drawer ocupara o espaco apos a sidebar (respeitando sua largura) e abaixo do header fixo.

---

## Abordagem Tecnica

Para criar o efeito "quase fullscreen", usaremos CSS customizado no SheetContent:

```css
/* Sidebar colapsada: 64px (w-16) */
/* Sidebar expandida: 224px (w-56) */
/* Header: ~57px de altura */

.drawer-content-area {
  left: var(--sidebar-width);  /* dinamico */
  top: 57px;                   /* altura do header */
  right: 0;
  bottom: 0;
  width: auto;
  height: auto;
}
```

Como o estado `isCollapsed` da sidebar esta dentro do `DashboardSidebar`, precisaremos:
1. Usar uma largura fixa conservadora (16rem = 256px) que funcione em ambos estados
2. OU passar o estado collapsed via contexto (mais complexo)

**Decisao**: Usar posicionamento fixo com margem esquerda que acomode a sidebar expandida (w-56 = 224px), garantindo que o drawer nunca sobreponha a sidebar.

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/CRM/CRMContent.tsx` | Conteudo extraido da pagina CRM.tsx |
| `src/components/CRM/CRMDrawer.tsx` | Drawer fullscreen para Clientes |
| `src/components/Financial/FinancialContent.tsx` | Conteudo extraido da pagina Financial.tsx |
| `src/components/Financial/FinancialDrawer.tsx` | Drawer fullscreen para Financeiro |
| `src/components/Reunioes/ReunioesContent.tsx` | Conteudo extraido da pagina Reunioes.tsx |
| `src/components/Reunioes/ReunioesDrawer.tsx` | Drawer fullscreen para Reunioes |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ui/sheet.tsx` | Adicionar variante `inset` para drawer posicionado apos sidebar |
| `src/components/Dashboard/DashboardSidebar.tsx` | Adicionar handlers para abrir os novos drawers |
| `src/components/Controladoria/ControladoriaDrawer.tsx` | Usar nova variante `inset` |
| `src/components/Projects/ProjectsDrawer.tsx` | Ajustar para usar posicionamento consistente |

---

## Detalhes de Implementacao

### 1. Modificar sheet.tsx - Nova Variante

Adicionar uma nova variante de posicionamento que respeita a sidebar:

```typescript
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out ...",
  {
    variants: {
      side: {
        // ... existentes ...
        // NOVA: Drawer que respeita sidebar e header
        inset: "top-[57px] left-[224px] right-0 bottom-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
    },
    // ...
  },
);
```

### 2. Estrutura dos Content Components

Cada `*Content.tsx` tera a estrutura:

```typescript
export function CRMContent() {
  // Hooks e estado (extraidos da pagina original)
  const { user } = useAuth();
  const { fetchClientes, deleteCliente } = useClientes();
  // ...

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM - Gestao de Clientes</h1>
          <p className="text-muted-foreground">Gerencie leads, prospects e clientes</p>
        </div>
        {/* Acoes */}
      </div>

      {/* Metricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cards */}
      </div>

      {/* Tabs e conteudo */}
      <Tabs>
        {/* ... */}
      </Tabs>
    </div>
  );
}
```

### 3. Estrutura dos Drawer Components

```typescript
export function CRMDrawer({ open, onOpenChange }: CRMDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="inset"  // Nova variante
        className="p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">CRM - Clientes</SheetTitle>
        
        {/* Header com icone e X automatico */}
        <div className="flex items-center gap-2 px-6 py-4 border-b bg-background">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Clientes</span>
        </div>

        {/* Conteudo scrollavel */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <CRMContent />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### 4. Modificar DashboardSidebar.tsx

```typescript
const DashboardSidebar = ({ currentPage }: DashboardSidebarProps) => {
  // Estados existentes...
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
  const [controladoriaDrawerOpen, setControladoriaDrawerOpen] = useState(false);
  
  // NOVOS estados
  const [crmDrawerOpen, setCRMDrawerOpen] = useState(false);
  const [financialDrawerOpen, setFinancialDrawerOpen] = useState(false);
  const [reunioesDrawerOpen, setReunioesDrawerOpen] = useState(false);

  // Handler para cada item...
  if (item.id === 'clientes') {
    return (
      <Button onClick={() => setCRMDrawerOpen(true)}>
        <Icon size={20} />
        {!isCollapsed && <span>{item.label}</span>}
      </Button>
    );
  }

  // ... similar para financeiro e reunioes

  return (
    <>
      {/* Sidebar content */}
      
      {/* Drawers */}
      <ProjectsDrawer open={projectsDrawerOpen} onOpenChange={setProjectsDrawerOpen} />
      <ControladoriaDrawer open={controladoriaDrawerOpen} onOpenChange={setControladoriaDrawerOpen} />
      <CRMDrawer open={crmDrawerOpen} onOpenChange={setCRMDrawerOpen} />
      <FinancialDrawer open={financialDrawerOpen} onOpenChange={setFinancialDrawerOpen} />
      <ReunioesDrawer open={reunioesDrawerOpen} onOpenChange={setReunioesDrawerOpen} />
    </>
  );
};
```

---

## Posicionamento do Drawer

O drawer usara posicionamento fixo com:

| Propriedade | Valor | Descricao |
|-------------|-------|-----------|
| `top` | `57px` | Altura do header |
| `left` | `224px` | Largura da sidebar expandida (w-56) |
| `right` | `0` | Ate a borda direita |
| `bottom` | `0` | Ate a borda inferior |

Em mobile (md:hidden), a sidebar fica oculta, entao o drawer ocupara toda a tela:

```css
@media (max-width: 768px) {
  left: 0;  /* Sidebar esta oculta em mobile */
}
```

---

## Fluxo de Navegacao

```text
1. Usuario clica em "Clientes" na sidebar
           │
           ▼
2. setCRMDrawerOpen(true)
           │
           ▼
3. CRMDrawer abre com animacao slide-in
   - Posicionado apos sidebar e abaixo do header
   - Mostra skeleton enquanto carrega dados
           │
           ▼
4. CRMContent renderiza o conteudo completo
           │
           ▼
5. Para fechar:
   ├─ Clicar no X (canto superior direito)
   ├─ Clicar no overlay (area escura)
   └─ Pressionar ESC
```

---

## Resumo das Tarefas

| # | Tarefa | Arquivo |
|---|--------|---------|
| 1 | Adicionar variante `inset` no Sheet | `sheet.tsx` |
| 2 | Criar CRMContent extraindo logica | `CRM/CRMContent.tsx` |
| 3 | Criar CRMDrawer | `CRM/CRMDrawer.tsx` |
| 4 | Criar FinancialContent extraindo logica | `Financial/FinancialContent.tsx` |
| 5 | Criar FinancialDrawer | `Financial/FinancialDrawer.tsx` |
| 6 | Criar ReunioesContent extraindo logica | `Reunioes/ReunioesContent.tsx` |
| 7 | Criar ReunioesDrawer | `Reunioes/ReunioesDrawer.tsx` |
| 8 | Atualizar ControladoriaDrawer para usar `inset` | `ControladoriaDrawer.tsx` |
| 9 | Atualizar ProjectsDrawer para consistencia | `ProjectsDrawer.tsx` |
| 10 | Adicionar estados e handlers no Sidebar | `DashboardSidebar.tsx` |

---

## Resultado Final

- Clientes, Financeiro, Reunioes e Controladoria abrirao em drawers fluidos
- Todos os drawers respeitarao a sidebar e o header
- Animacao suave de entrada (slide da direita para esquerda)
- Botao X discreto no canto superior direito
- Paginas originais continuam funcionando como fallback (acesso direto por URL)
