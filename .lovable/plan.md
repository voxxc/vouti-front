
# Redesenhar Navegacao de Abas na Controladoria

## Objetivo
Converter as abas de botoes (estilo pill/rounded) para um design minimalista de links de texto clicaveis com linha inferior no item ativo, seguindo o padrao do `ClienteDetails.tsx`.

---

## Alteracoes

### 1. Abas superiores (Central, OABs, Push-Doc)
**Arquivo:** `src/components/Controladoria/ControladoriaContent.tsx`

**De (atual):**
```tsx
<TabsList className="flex-shrink-0">
  <TabsTrigger value="central">
    <ClipboardCheck className="mr-2 h-4 w-4" />
    Central
  </TabsTrigger>
  ...
</TabsList>
```

**Para (novo design):**
```tsx
<div className="flex gap-6 border-b flex-shrink-0">
  <button
    onClick={() => setActiveTab('central')}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative",
      activeTab === 'central'
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Central
    {activeTab === 'central' && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
  <button ... >OABs</button>
  <button ... >Push-Doc</button>
</div>
```

**Mudancas:**
- Remover icones das abas (ClipboardCheck, Scale, Building2)
- Substituir TabsList/TabsTrigger por botoes customizados
- Adicionar state local `activeTab` para controlar a aba ativa
- Renderizar conteudo condicionalmente baseado no `activeTab`

---

### 2. Abas inferiores (Andamentos Nao Lidos, Prazos Concluidos)
**Arquivo:** `src/components/Controladoria/CentralControladoria.tsx`

**De (atual):**
```tsx
<TabsList className="flex-shrink-0">
  <TabsTrigger value="andamentos" className="flex items-center gap-2">
    <Bell className="h-4 w-4" />
    Andamentos Nao Lidos
    {totalNaoLidos > 0 && <Badge ...>{totalNaoLidos}</Badge>}
  </TabsTrigger>
  <TabsTrigger value="prazos" className="flex items-center gap-2">
    <CheckCircle2 className="h-4 w-4" />
    Prazos Concluidos
  </TabsTrigger>
</TabsList>
```

**Para (novo design):**
```tsx
<div className="flex gap-6 border-b flex-shrink-0">
  <button
    onClick={() => setActiveTab('andamentos')}
    className={cn(
      "pb-2 text-sm font-medium transition-colors relative flex items-center gap-2",
      activeTab === 'andamentos'
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    Andamentos Nao Lidos
    {totalNaoLidos > 0 && <Badge ...>{totalNaoLidos}</Badge>}
    {activeTab === 'andamentos' && (
      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
    )}
  </button>
  <button ... >Prazos Concluidos</button>
</div>
```

**Mudancas:**
- Remover icones (Bell, CheckCircle2)
- Substituir Tabs/TabsList/TabsTrigger por navegacao customizada
- Manter o badge de contagem nos "Andamentos Nao Lidos"
- Adicionar state local para controlar aba ativa
- Renderizar conteudo condicionalmente

---

## Resultado Visual

### Antes
```
┌─────────────────────────────────────────┐
│ [📋 Central] [⚖ OABs] [🏢 Push-Doc]    │  <- botoes pill/rounded com icones
│                                         │
│   [🔔 Andamentos Nao Lidos] [✓ Prazos] │  <- botoes pill/rounded com icones
└─────────────────────────────────────────┘
```

### Depois
```
┌─────────────────────────────────────────┐
│ Central   OABs   Push-Doc               │  <- texto alinhado esquerda
│ ───────                                 │  <- linha sob item ativo
│                                         │
│ Andamentos Nao Lidos (5)   Prazos Concluidos
│ ────────────────────────                │  <- linha sob item ativo
└─────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Controladoria/ControladoriaContent.tsx` | Substituir TabsList por navegacao de texto, adicionar state |
| `src/components/Controladoria/CentralControladoria.tsx` | Substituir TabsList por navegacao de texto, remover icones |

---

## Detalhes Tecnicos

- Importar `useState` e `cn` nos arquivos
- Remover imports nao utilizados (Tabs, TabsList, TabsTrigger, icones)
- Manter imports do TabsContent apenas se continuar usando Radix, ou substituir por renderizacao condicional simples
- A logica de fetch do badge `totalNaoLidos` permanece inalterada
