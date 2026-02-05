
# Correcao: Container da Controladoria Cresce Indefinidamente

## Problema Identificado

A seção Controladoria perde seus limites visuais após o carregamento dos dados porque:

1. O `ControladoriaDrawer` usa um `ScrollArea` com `flex-1` para o conteúdo
2. Os componentes internos (`OABTab`, `CentralAndamentosNaoLidos`) usam altura fixa baseada em `100vh` (viewport total)
3. Essa altura `calc(100vh-320px)` é calculada em relação à tela inteira, não ao espaço disponível dentro do drawer
4. Resultado: o conteúdo "escapa" do container, criando scroll duplo e perdendo bordas/acoes laterais

## Conceito Visual

```text
PROBLEMA ATUAL:
┌─ Drawer ─────────────────────────────────────────────────────────┐
│ ┌─ ScrollArea (flex-1) ─────────────────────────────────────────┐│
│ │ ┌─ ControladoriaContent ─────────────────────────────────────┐││
│ │ │  Header, Cards, Tabs...                                    │││
│ │ │ ┌─ OABTab ────────────────────────────────────────────────┐│││
│ │ │ │  h-[calc(100vh-320px)] ← Ignora contexto do drawer     ││││
│ │ │ │  Conteudo cresce para fora                              ││││
│ │ │ │  ...                                                    ││││
│ │ │ │  ...                                                    ││││
│ │ │ │  ... (botoes cortados, bordas invisíveis)              ││││
│ │ │ └─────────────────────────────────────────────────────────┘│││
│ │ └─────────────────────────────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘

SOLUCAO PROPOSTA:
┌─ Drawer (flex flex-col h-full) ──────────────────────────────────┐
│ [Header fixo]                                                     │
│ ┌─ Container Flex (flex-1 min-h-0 overflow-hidden) ──────────────┐│
│ │ ┌─ ControladoriaContent (h-full flex flex-col) ───────────────┐││
│ │ │  [Header/Cards - altura fixa]                               │││
│ │ │ ┌─ Tabs (flex-1 min-h-0 flex flex-col) ────────────────────┐│││
│ │ │ │ ┌─ TabsContent (flex-1 overflow-auto) ──────────────────┐││││
│ │ │ │ │  Scroll interno respeita limites do pai               │││││
│ │ │ │ │  Botoes e bordas sempre visíveis                      │││││
│ │ │ │ └───────────────────────────────────────────────────────┘││││
│ │ │ └──────────────────────────────────────────────────────────┘│││
│ │ └─────────────────────────────────────────────────────────────┘││
│ └────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
```

## Solucao

Reestruturar a hierarquia de containers para usar flexbox corretamente, eliminando o scroll duplo e garantindo que cada seção respeite seu espaco disponível.

## Alteracoes

### 1. ControladoriaDrawer.tsx

Remover o `ScrollArea` do wrapper principal e usar flexbox puro. O scroll deve ocorrer dentro de cada aba, nao no drawer inteiro.

```tsx
// ANTES:
<ScrollArea className="flex-1">
  <div className="p-6">
    <ControladoriaContent />
  </div>
</ScrollArea>

// DEPOIS:
<div className="flex-1 min-h-0 overflow-hidden p-6">
  <ControladoriaContent />
</div>
```

### 2. ControladoriaContent.tsx

Transformar em container flex que ocupa todo o espaco disponivel e delega scroll para as abas.

```tsx
// ANTES:
<div className="space-y-6">
  ...
  <Tabs defaultValue="central" className="space-y-4">

// DEPOIS:
<div className="h-full flex flex-col space-y-6">
  ...
  <Tabs defaultValue="central" className="flex-1 min-h-0 flex flex-col space-y-4">
```

Cada `TabsContent` precisa ter `flex-1 min-h-0 overflow-auto`:

```tsx
<TabsContent value="central" className="flex-1 min-h-0 overflow-auto">
  <Card className="h-full">
    <CardContent className="pt-6 h-full">
      <CentralControladoria />
    </CardContent>
  </Card>
</TabsContent>
```

### 3. OABTab.tsx

Remover a altura fixa baseada em viewport e usar flex para ocupar espaco disponível.

```tsx
// ANTES:
<div className="h-[calc(100vh-320px)] overflow-y-auto">

// DEPOIS:
<div className="flex-1 min-h-0 overflow-y-auto">
```

E garantir que o container pai (retorno do componente) seja flex:

```tsx
// O componente OABTab deve retornar um fragmento com estrutura flex
// ou usar um wrapper
return (
  <div className="h-full flex flex-col">
    {/* ... Header/filtros ... */}
    
    {/* Area Scrollavel */}
    <div className="flex-1 min-h-0 overflow-y-auto pr-4">
      {/* ... DragDropContext ... */}
    </div>
  </div>
);
```

### 4. OABManager.tsx

O container principal do OABManager tambem precisa usar altura total:

```tsx
// ANTES:
<div className="space-y-4">

// DEPOIS:
<div className="h-full flex flex-col space-y-4">
```

E o `TabsContent` que contem o `OABTab`:

```tsx
<TabsContent key={oab.id} value={oab.id} className="mt-4 flex-1 min-h-0">
  <OABTab ... />
</TabsContent>
```

### 5. CentralControladoria.tsx

Mesmo tratamento para a aba Central:

```tsx
// Adicionar altura total e flex
<Tabs defaultValue="andamentos" className="h-full flex flex-col space-y-4">
  <TabsList>...</TabsList>
  
  <TabsContent value="andamentos" className="flex-1 min-h-0 overflow-auto">
    <CentralAndamentosNaoLidos />
  </TabsContent>
</Tabs>
```

### 6. CentralAndamentosNaoLidos.tsx

Remover qualquer altura fixa e usar flex:

```tsx
<div className="h-full flex flex-col space-y-4">
  {/* Filtros - altura fixa */}
  <div className="flex-shrink-0">...</div>
  
  {/* Tabela - flex-1 com scroll */}
  <Card className="flex-1 min-h-0">
    <CardContent className="p-0 h-full overflow-auto">
      <Table>...</Table>
    </CardContent>
  </Card>
</div>
```

## Resumo das Classes Chave

| Conceito | Classes Tailwind |
|----------|------------------|
| Container que ocupa espaco disponivel | `flex-1 min-h-0` |
| Container que permite scroll interno | `overflow-y-auto` ou `overflow-auto` |
| Container flex vertical | `flex flex-col` |
| Impedir que filhos encolham | `flex-shrink-0` |
| Ocupar altura total do pai | `h-full` |

## Arquivos a Editar

1. `src/components/Controladoria/ControladoriaDrawer.tsx`
2. `src/components/Controladoria/ControladoriaContent.tsx`
3. `src/components/Controladoria/OABTab.tsx`
4. `src/components/Controladoria/OABManager.tsx`
5. `src/components/Controladoria/CentralControladoria.tsx`
6. `src/components/Controladoria/CentralAndamentosNaoLidos.tsx`

## Resultado Esperado

- Container da Controladoria mantem limites visuais claros
- Altura controlada mesmo apos carregamento de dados
- Scroll interno funcionando corretamente dentro de cada aba
- Botoes de acao sempre visiveis na lateral direita
- Bordas dos cards preservadas
- Layout estavel independente da quantidade de dados
