

# Ajustar Drawer de Projetos

## Problemas Identificados

1. **Drawer cobrindo a sidebar**: A variante `left` posiciona o drawer em `left-0`, cobrindo a sidebar
2. **Projetos muito colados**: Os items da lista de projetos estao com `space-y-1` (4px) sem separador visual

## Solucao

### 1. Criar nova variante para o drawer de projetos

Criar uma variante `left-offset` que posiciona o drawer apos a sidebar, similar ao `inset` mas com largura fixa menor.

### 2. Adicionar linha separadora entre projetos

Usar `border-b` sutil entre cada projeto para criar separacao visual.

---

## Conceito Visual

```text
ATUAL (left):                           PROPOSTO (left-offset):
                                        
┌──────────────────────────────┐        ┌──────────┬───────────────────┐
│▓▓▓▓▓▓▓▓▓▓│                   │        │          │                   │
│▓ DRAWER ▓│   (overlay)       │        │ SIDEBAR  │ DRAWER            │
│▓ cobre  ▓│                   │        │ (visivel)│ (ao lado)         │
│▓ sidebar▓│                   │        │          │                   │
└──────────────────────────────┘        └──────────┴───────────────────┘
```

---

## Arquivos a Modificar

### 1. `src/components/ui/sheet.tsx`

Adicionar nova variante `left-offset`:

```typescript
"left-offset": 
  "inset-y-0 md:left-[224px] left-0 h-full w-80 sm:max-w-sm border-l data-[state=closed]:animate-drawer-out data-[state=open]:animate-drawer-in",
```

E ajustar a logica do overlay para nao mostrar em `left-offset`:

```typescript
{side !== "inset" && side !== "left-offset" && <SheetOverlay />}
```

### 2. `src/components/Projects/ProjectsDrawer.tsx`

**Alteracao 1** - Usar nova variante:
```tsx
<SheetContent side="left-offset" className="p-0 flex flex-col">
```

**Alteracao 2** - Adicionar separador entre projetos (linha ~171-208):
```tsx
filteredProjects.map((project, index) => {
  const stats = getProjectStats(project.id);
  return (
    <button
      key={project.id}
      onClick={() => handleSelectProject(project)}
      className={cn(
        "w-full text-left p-3 transition-colors",
        "hover:bg-accent/50 focus:bg-accent/50 focus:outline-none",
        "group",
        // Adiciona borda inferior em todos exceto o ultimo
        index < filteredProjects.length - 1 && "border-b border-border/50"
      )}
    >
      {/* ... conteudo existente ... */}
    </button>
  );
})
```

---

## Resultado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Posicao do drawer | Cobre a sidebar | Surge ao lado da sidebar |
| Overlay escuro | Sim | Nao |
| Separacao entre projetos | 4px sem linha | Linha sutil `border-border/50` |
| Animacao | Slide da esquerda | Fade + translate sutil |

