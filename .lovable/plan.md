
# Ajustes Visuais do Drawer de Projetos

## Problemas Identificados

1. **Botao "+ Novo Projeto"**: Usa `w-full` e ocupa toda a largura do drawer
2. **Barra de pesquisa**: Tambem ocupa 100% da largura ate o limite
3. **Cards de projeto**: Os botoes de projeto vao ate a borda do drawer

Atualmente o padding do container e `p-6` (24px), mas os elementos internos ocupam 100% da largura disponivel.

## Conceito Visual

```text
ATUAL (problema):                       PROPOSTO (ajustado):
                                        
┌────────────────────────────────┐      ┌────────────────────────────────┐
│ Projetos                       │      │ Projetos                       │
├────────────────────────────────┤      ├────────────────────────────────┤
│ [+ Novo Projeto.............]  │      │ [+ Novo Projeto]               │
│ [Buscar projetos............]  │      │                                │
│ ┌──────────────────────────┐   │      │ [🔍 Buscar projetos...   ]     │
│ │ Projeto 1               >│   │      │                                │
│ └──────────────────────────┘   │      │   Projeto 1               >    │
│ ┌──────────────────────────┐   │      │   ───────────────────          │
│ │ Projeto 2               >│   │      │   Projeto 2               >    │
│ └──────────────────────────┘   │      │   ───────────────────          │
└────────────────────────────────┘      └────────────────────────────────┘
```

## Alteracoes

### Arquivo: `src/components/Projects/ProjectsDrawer.tsx`

**1. Botao "+ Novo Projeto" (linha 140-146)**

Antes:
```tsx
<Button
  className="w-full justify-start gap-2"
  onClick={() => setShowCreateForm(true)}
>
```

Depois:
```tsx
<Button
  size="sm"
  className="gap-2"
  onClick={() => setShowCreateForm(true)}
>
```

Remove `w-full` e `justify-start`, adiciona `size="sm"` para um botao mais compacto.

**2. Barra de pesquisa (linha 149-157)**

Antes:
```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Buscar projetos..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="pl-9 h-9"
  />
</div>
```

Depois:
```tsx
<div className="relative max-w-[280px]">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Buscar projetos..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="pl-9 h-9"
  />
</div>
```

Adiciona `max-w-[280px]` para limitar a largura.

**3. Cards de projeto (linha 159 e 176-184)**

Antes:
```tsx
<div className="space-y-1">
  ...
  <button
    className={cn(
      "w-full text-left p-3 transition-colors",
      ...
    )}
  >
```

Depois:
```tsx
<div className="space-y-1 pr-4">
  ...
  <button
    className={cn(
      "w-full text-left p-3 rounded-lg transition-colors",
      ...
    )}
  >
```

Adiciona `pr-4` no container para criar respiro da borda direita e `rounded-lg` nos cards para um visual mais suave.

## Resultado

| Elemento | Antes | Depois |
|----------|-------|--------|
| Botao Novo Projeto | Largura 100%, tamanho normal | Largura automatica, tamanho pequeno |
| Barra de pesquisa | Largura 100% | Max 280px |
| Cards de projeto | Colados na borda | Com respiro de 16px da borda direita |
| Visual geral | Elementos esticados | Mais equilibrado e elegante |
