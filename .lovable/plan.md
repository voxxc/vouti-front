

## Plano: Mover menu 3 pontos para o rodapé (ao lado do botão Concluir)

### Mudança

**Arquivo**: `src/components/Project/ProjectProtocoloContent.tsx`

1. **Remover** o `DropdownMenu` do header (linhas 825-839) — manter apenas o título e o número do prazo no header.

2. **Adicionar** o `DropdownMenu` no rodapé (linha 930-940), ao lado do botão "Marcar como Concluído" / "Reabrir Prazo":

```tsx
<div className="flex items-center gap-2 pt-4 border-t">
  {!selectedDeadline.completed ? (
    <Button onClick={() => setConfirmCompleteId(selectedDeadline.id)} className="flex-1">
      <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como Concluído
    </Button>
  ) : (
    <Button variant="outline" onClick={() => toggleDeadlineCompletion(...)} className="flex-1">
      <X className="h-4 w-4 mr-2" /> Reabrir Prazo
    </Button>
  )}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => handleEditDeadline(selectedDeadline)}>
        <Pencil className="h-4 w-4 mr-2" /> Editar
      </DropdownMenuItem>
      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDeadlineConfirm(selectedDeadline.id)}>
        <Trash2 className="h-4 w-4 mr-2" /> Excluir
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

Isso padroniza com o layout do `DeadlineDetailDialog` (Dashboard/Agenda).

