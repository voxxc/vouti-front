

## Controlar reordenacao de processos via cadeado do workspace

### O que muda

O botao de cadeado que ja existe na parte superior do workspace (em `SectorView.tsx` e `ProjectView.tsx`) passara a controlar tambem o drag-and-drop dos processos na aba "Processos". Quando o cadeado estiver **travado**, os processos ficam na posicao definida e nao podem ser arrastados. Quando **destravado**, o usuario pode arrastar para reorganizar livremente.

A ordem ja e salva no banco de dados (campo `ordem` na tabela `project_processos`), entao a posicao definida pelo usuario ja persiste entre sessoes.

### Mudancas tecnicas

**1. `src/components/Project/ProjectProcessos.tsx`**

- Adicionar prop `isLocked` (boolean, default `true`)
- Passar `isDragDisabled={isLocked}` para cada `<Draggable>` no `ProcessoCard`
- Quando `isLocked`, o grip handle fica com visual desabilitado (opacidade reduzida, cursor `not-allowed`)
- Quando desbloqueado, visual normal com `cursor-grab`

**2. `src/pages/ProjectView.tsx`**

- Passar `isLocked={isColumnsLocked}` para o componente `<ProjectProcessos>` na aba "processos"

**3. `src/pages/SectorView.tsx`**

- Passar `isLocked={isColumnsLocked}` para o componente `<ProjectProcessos>` na aba "processos" (se existir nessa view)

### Detalhes de implementacao

No `ProcessoCard`, a mudanca e minimal:

```text
// Antes:
<Draggable draggableId={item.id} index={index}>

// Depois:
<Draggable draggableId={item.id} index={index} isDragDisabled={isLocked}>
```

E no grip handle:

```text
// Antes:
<div className="cursor-grab active:cursor-grabbing ...">

// Depois:
<div className={isLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}>
  <GripVertical className={isLocked ? "text-muted-foreground/30" : "text-muted-foreground"} />
```

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/Project/ProjectProcessos.tsx` | Adicionar prop `isLocked`, desabilitar drag quando travado |
| `src/pages/ProjectView.tsx` | Passar `isLocked={isColumnsLocked}` ao `ProjectProcessos` |
| `src/pages/SectorView.tsx` | Passar `isLocked={isColumnsLocked}` ao `ProjectProcessos` (se aplicavel) |
