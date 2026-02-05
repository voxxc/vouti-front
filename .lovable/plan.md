
# Drawer Full-Screen para Controladoria

## Conceito

Ao clicar em "Controladoria" no menu lateral, ao inves de navegar para uma nova pagina, abrira um **drawer full-screen** (ocupando toda a tela) vindo da direita, contendo o mesmo visual da pagina atual da Controladoria, com um pequeno **X** no canto superior direito para fechar.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ [SIDEBAR]  │                 DRAWER FULL-SCREEN                            [X] │
│            │ ────────────────────────────────────────────────────────────────── │
│  Dashboard │  Controladoria                                                     │
│  Projetos  │  Gestao e controle de processos juridicos                          │
│  Agenda    │                                                                    │
│  Clientes  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  Financ.   │  │Total    │ │OABs     │ │Monitorad│ │CNPJs    │ │Push-Doc │       │
│  *Control* │  │Processos│ │Cadastr. │ │os       │ │         │ │Monitor. │       │
│  Reunioes  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│            │                                                                    │
│            │  [Central] [OABs] [Push-Doc]                                       │
│            │  ┌─────────────────────────────────────────────────────────────┐   │
│            │  │                                                             │   │
│            │  │              Conteudo da tab selecionada                    │   │
│            │  │                                                             │   │
│            │  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Vantagens

| Problema Atual | Solucao com Drawer Full-Screen |
|----------------|-------------------------------|
| Navegacao lenta (carrega pagina + layout completo) | Drawer abre instantaneamente, conteudo carrega em paralelo |
| Perde contexto da pagina anterior | Pagina anterior continua "por tras" do drawer |
| Precisa navegar de volta | Basta clicar no X ou fora do drawer |
| Sensacao de "carregamento" ao trocar de pagina | Transicao suave e imediata |

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/Controladoria/ControladoriaDrawer.tsx` | **CRIAR** | Drawer full-screen com conteudo da Controladoria |
| `src/components/Controladoria/ControladoriaContent.tsx` | **CRIAR** | Componente extraido do conteudo da pagina (reutilizavel) |
| `src/components/Dashboard/DashboardSidebar.tsx` | **MODIFICAR** | Botao "Controladoria" abre drawer ao inves de navegar |

---

## Estrutura dos Componentes

### 1. ControladoriaContent.tsx (Conteudo Reutilizavel)

Extrair o conteudo atual da pagina `Controladoria.tsx` para um componente separado que pode ser usado tanto no drawer quanto na pagina (fallback).

```typescript
export const ControladoriaContent = () => {
  const { metrics, loading, isCacheLoaded, isRefreshing } = useControladoriaCache();
  const showSkeleton = loading && !isCacheLoaded;

  return (
    <div className="space-y-6">
      {/* Header com titulo */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controladoria</h1>
          <p className="text-muted-foreground mt-2">
            Gestao e controle de processos juridicos
          </p>
        </div>
        {isRefreshing && <RefreshIndicator />}
      </div>

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* ... cards existentes ... */}
      </div>

      {/* Tabs: Central, OABs, Push-Doc */}
      <Tabs defaultValue="central" className="space-y-4">
        {/* ... tabs existentes ... */}
      </Tabs>
    </div>
  );
};
```

### 2. ControladoriaDrawer.tsx (Drawer Full-Screen)

```typescript
interface ControladoriaDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ControladoriaDrawer({ open, onOpenChange }: ControladoriaDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-none p-0 flex flex-col"
      >
        {/* Header com botao X */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Controladoria</span>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>

        {/* Conteudo scrollavel */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <ControladoriaContent />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
```

### 3. Modificacao no DashboardSidebar.tsx

```typescript
const DashboardSidebar = ({ currentPage }: DashboardSidebarProps) => {
  const [projectsDrawerOpen, setProjectsDrawerOpen] = useState(false);
  const [controladoriaDrawerOpen, setControladoriaDrawerOpen] = useState(false);
  
  // No item "Controladoria", abrir drawer:
  if (item.id === 'controladoria') {
    return (
      <Button
        key={item.id}
        onClick={() => {
          setControladoriaDrawerOpen(true);
          setIsMobileOpen(false);
        }}
        // ...estilos
      >
        <Icon size={20} />
        {!isCollapsed && <span>{item.label}</span>}
      </Button>
    );
  }

  // Renderizar drawer
  <ControladoriaDrawer 
    open={controladoriaDrawerOpen} 
    onOpenChange={setControladoriaDrawerOpen} 
  />
};
```

---

## Estilo do Drawer Full-Screen

O drawer usara o componente `Sheet` existente com configuracoes especificas:

```typescript
<SheetContent 
  side="right" 
  className="w-full sm:max-w-none p-0"
>
```

- `side="right"`: Desliza da direita para a esquerda
- `w-full sm:max-w-none`: Ocupa 100% da largura em todas as telas
- `p-0`: Remove padding padrao para controle personalizado

---

## Botao X Discreto

O botao de fechar sera pequeno e posicionado no canto superior direito do header:

```text
┌─────────────────────────────────────────────────────────────┐
│  📋 Controladoria                                      [X] │
├─────────────────────────────────────────────────────────────┤
```

- Usa `SheetClose` para fechar automaticamente
- Icone pequeno (`h-4 w-4`)
- Estilo `ghost` para ser discreto

---

## Fluxo de Interacao

```text
1. Usuario clica "Controladoria" na sidebar
           │
           ▼
2. Drawer full-screen abre INSTANTANEAMENTE (da direita)
   com skeleton loaders se dados nao estiverem cacheados
           │
           ▼
3. Hook useControladoriaCache busca/usa dados cacheados
           │
           ▼
4. Conteudo completo aparece (metricas, tabs, etc.)
           │
           ▼
5. Usuario interage normalmente com toda a interface
           │
           ▼
6. Para fechar:
   ├─ Clicar no X
   ├─ Clicar fora do drawer (no overlay)
   └─ Pressionar ESC
```

---

## Detalhes Tecnicos

### Cache e Performance

O hook `useControladoriaCache` ja implementa:
- Cache local com exibicao instantanea
- Atualizacao em background (stale-while-revalidate)
- Real-time subscriptions para atualizacoes automaticas

### Acessibilidade

- `SheetTitle` para leitores de tela
- `SheetDescription` opcional
- Foco gerenciado automaticamente pelo Radix Dialog

### Mobile

Em telas menores, o drawer ocupara 100% da largura naturalmente, proporcionando experiencia nativa de app.

---

## Resumo das Alteracoes

| Etapa | Descricao |
|-------|-----------|
| 1 | Criar `ControladoriaContent.tsx` extraindo conteudo da pagina atual |
| 2 | Criar `ControladoriaDrawer.tsx` com Sheet full-screen e botao X |
| 3 | Modificar `DashboardSidebar.tsx` para abrir drawer no clique |
| 4 | Manter pagina `/controladoria` funcionando como fallback |

O resultado: clicar em "Controladoria" abre instantaneamente um drawer full-screen fluido, mantendo toda a funcionalidade atual com UX muito mais rapida.
