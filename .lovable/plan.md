
# Enquadrar Conteúdo do Projeto no Drawer

## Problema Identificado

Quando o projeto abre no drawer, o conteúdo fica "colado" nas bordas (sidebar e topbar), sem o espaçamento adequado. Isso acontece porque:

| Elemento | Página Normal | Drawer Atual |
|----------|---------------|--------------|
| Container | `container max-w-7xl mx-auto` | Nenhum |
| Padding | `px-6 py-8` | Nenhum (p-0 no SheetContent) |
| Overflow | Scroll no main | `overflow-auto` no div |

Na página normal, o `DashboardLayout` aplica essas classes no `<main>`:
```
<main className="container max-w-7xl mx-auto px-6 py-8">
```

No drawer, o `ProjectDrawerContent` apenas usa:
```
<div className="flex flex-col h-full overflow-auto">
```

## Solucao

Adicionar o mesmo enquadramento (container + padding) ao `ProjectDrawerContent` para replicar exatamente o visual da página original.

## Mudanca no Codigo

### Arquivo: `src/components/Project/ProjectDrawerContent.tsx`

Modificar o wrapper de renderização (linhas 170-182):

**Antes:**
```tsx
return (
  <div className="flex flex-col h-full overflow-auto">
    <ProjectView
      ...
    />
  </div>
);
```

**Depois:**
```tsx
return (
  <div className="flex-1 h-full overflow-auto">
    <div className="container max-w-7xl mx-auto px-6 py-8">
      <ProjectView
        ...
      />
    </div>
  </div>
);
```

## Resultado Visual

O conteúdo terá:
- Padding lateral de 24px (px-6)
- Padding vertical de 32px (py-8) 
- Largura máxima de 1280px (max-w-7xl)
- Centralização horizontal (mx-auto)

Exatamente igual à página original do projeto.
