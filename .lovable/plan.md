
# Corrigir Troca Direta entre Drawers

## Problema Identificado

Atualmente cada drawer tem seu próprio estado independente no `DashboardSidebar`:

```tsx
const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
const [controladoriaDrawerOpen, setControladoriaDrawerOpen] = useState(false);
const [crmDrawerOpen, setCrmDrawerOpen] = useState(false);
// ... etc
```

Quando o usuário clica em um novo item da sidebar enquanto um drawer está aberto, o Radix Dialog detecta o clique como "fora do drawer" e fecha o drawer atual, consumindo o evento. Por isso é necessário clicar duas vezes.

## Solução

Substituir os múltiplos estados booleanos por um único estado que indica qual drawer está ativo:

```tsx
type ActiveDrawer = 'projetos' | 'agenda' | 'clientes' | 'financeiro' | 'controladoria' | 'reunioes' | null;
const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
```

Além disso, configurar os drawers para **não fechar ao clicar fora**, permitindo que o clique na sidebar seja processado normalmente e abra o novo drawer diretamente.

## Alterações Técnicas

### 1. src/components/Dashboard/DashboardSidebar.tsx

**Remover** os estados individuais:
```tsx
// REMOVER
const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
const [controladoriaDrawerOpen, setControladoriaDrawerOpen] = useState(false);
const [crmDrawerOpen, setCrmDrawerOpen] = useState(false);
const [financialDrawerOpen, setFinancialDrawerOpen] = useState(false);
const [reunioesDrawerOpen, setReunioesDrawerOpen] = useState(false);
const [agendaDrawerOpen, setAgendaDrawerOpen] = useState(false);
```

**Adicionar** estado único:
```tsx
type ActiveDrawer = 'projetos' | 'agenda' | 'clientes' | 'financeiro' | 'controladoria' | 'reunioes' | null;
const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
```

**Atualizar** os handlers de clique:
```tsx
// Antes
onClick={() => {
  setAgendaDrawerOpen(true);
  setIsMobileOpen(false);
}}

// Depois
onClick={() => {
  setActiveDrawer('agenda');
  setIsMobileOpen(false);
}}
```

**Atualizar** a renderização dos drawers:
```tsx
<ProjectsDrawer 
  open={activeDrawer === 'projetos'} 
  onOpenChange={(open) => !open && setActiveDrawer(null)} 
/>
<ControladoriaDrawer 
  open={activeDrawer === 'controladoria'} 
  onOpenChange={(open) => !open && setActiveDrawer(null)} 
/>
// ... mesma lógica para os demais
```

### 2. src/components/ui/sheet.tsx

Adicionar prop `onInteractOutside` para os drawers tipo `inset` e `left-offset`, evitando que o clique fora feche o drawer automaticamente:

```tsx
<SheetPrimitive.Content 
  ref={ref} 
  className={cn(sheetVariants({ side }), className)} 
  onInteractOutside={(e) => {
    // Para drawers inset/left-offset, não fechar ao clicar fora
    if (side === "inset" || side === "left-offset") {
      e.preventDefault();
    }
  }}
  {...props}
>
```

## Resultado Esperado

1. Usuário clica em "Agenda" → Drawer da Agenda abre
2. Usuário clica em "Controladoria" (com Agenda aberto) → Drawer da Controladoria abre diretamente, substituindo o drawer da Agenda
3. Usuário clica no botão X do drawer ou em "Dashboard" → Drawer fecha

## Arquivos a Editar

1. `src/components/Dashboard/DashboardSidebar.tsx` - Unificar estados dos drawers
2. `src/components/ui/sheet.tsx` - Prevenir fechamento ao clicar fora para drawers inset/left-offset
