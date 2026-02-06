

# Remover Estrutura de % de Conclusao por Projetos

## Objetivo

Retirar a exibicao de porcentagem de conclusao dos projetos em todas as areas da interface.

---

## Locais Afetados

### 1. Drawer de Projetos (Sidebar)
**Arquivo:** `src/components/Projects/ProjectsDrawer.tsx`

Remover linhas 198-209:
- Barra de progresso (`Progress`)
- Texto de porcentagem (`{stats.progressPercentage}%`)
- Skeleton de loading da barra

### 2. Pagina de Projetos (Cards)
**Arquivo:** `src/pages/Projects.tsx`

Remover linhas 274-311:
- Secao "Progress Stats" inteira
- Barra de progresso customizada
- Texto "Progresso" e porcentagem
- Informacao "X em andamento"

---

## Alteracoes Detalhadas

### ProjectsDrawer.tsx

**Remover:**
```tsx
<div className="mt-2">
  {isDetailsLoaded ? (
    <div className="flex items-center gap-2">
      <Progress value={stats.progressPercentage} className="h-1.5 max-w-[200px]" />
      <span className="text-xs text-muted-foreground w-8 text-right">
        {stats.progressPercentage}%
      </span>
    </div>
  ) : (
    <Skeleton className="h-1.5 w-full" />
  )}
</div>
```

**Tambem remover:**
- Import do `Progress`
- Variavel `stats` (nao sera mais usada)
- `isDetailsLoaded` do destructuring do hook
- `getProjectStats` do destructuring do hook

### Projects.tsx

**Remover toda a secao "Progress Stats" (linhas 274-311):**
```tsx
{/* Progress Stats */}
<div className="space-y-3">
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">Progresso</span>
    ...
  </div>
  ...
</div>
```

**Substituir por informacao simplificada:**
```tsx
<div className="flex items-center justify-between text-sm text-muted-foreground">
  <span>{project.taskCount} tarefas</span>
  <div className="flex items-center gap-1">
    <Calendar className="h-3 w-3" />
    {format(project.updatedAt, "dd/MM/yy", { locale: ptBR })}
  </div>
</div>
```

**Tambem remover:**
- `isDetailsLoaded` do destructuring
- `getProjectStats` do destructuring
- Variaveis `stats` e `completionRate`

---

## Resultado Visual

### Antes (Drawer)
```
Nome do Projeto
Cliente • 5 tarefas
[████████░░░░] 75%
```

### Depois (Drawer)
```
Nome do Projeto
Cliente • 5 tarefas
```

### Antes (Cards)
```
┌─────────────────────┐
│ 📁 Nome do Projeto  │
│ Descricao...        │
│                     │
│ Progresso      75%  │
│ [████████░░░]       │
│ 5 tarefas  3 andamento │
└─────────────────────┘
```

### Depois (Cards)
```
┌─────────────────────┐
│ 📁 Nome do Projeto  │
│ Descricao...        │
│                     │
│ 5 tarefas   📅 dd/MM│
└─────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Projects/ProjectsDrawer.tsx` | Remover barra de progresso e imports relacionados |
| `src/pages/Projects.tsx` | Remover secao Progress Stats, simplificar rodape do card |

---

## Nota

O hook `useProjectsOptimized` e a funcao `calculateProjectProgress` serao mantidos, pois podem ser usados em outros locais da aplicacao (ex: Dashboard). A remocao e apenas da exibicao na listagem de projetos.

