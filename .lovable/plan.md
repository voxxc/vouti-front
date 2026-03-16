

# Menu de 3 pontinhos para prazos concluídos + Reabrir prazo com comentário

## Problema atual

O menu de 3 pontinhos (`MoreVertical`) só aparece para prazos **não concluídos** e somente para admins. Prazos concluídos não têm opção de editar, reabrir ou qualquer ação no `DeadlineRow`. O `DeadlineDetailDialog` (standalone do Dashboard) também não oferece essas ações para concluídos.

## Mudanças

### 1. `AgendaContent.tsx` — DeadlineRow (linhas 1020-1051)

Mostrar o `DropdownMenu` com 3 pontinhos **sempre** (para todos os prazos, inclusive concluídos), com opções condicionais:

- **Prazo pendente/vencido**: Editar Prazo, Estender Prazo (como já existe)
- **Prazo concluído**: "Marcar como Pendente" (reabrir), "Editar Prazo"

Ao clicar "Marcar como Pendente":
1. Abre um `AlertDialog` pedindo comentário obrigatório (motivo da reabertura)
2. Atualiza `deadlines.completed = false`, limpa `concluido_por`, `concluido_em`, `comentario_conclusao`
3. Insere um comentário rico em `deadline_comentarios` registrando quem reabriu e o motivo

### 2. `AgendaContent.tsx` — Novo estado e handler

```tsx
const [reopenDeadlineId, setReopenDeadlineId] = useState<string | null>(null);
const [reopenMotivo, setReopenMotivo] = useState("");
```

Novo `handleReopenDeadline`:
- Atualiza o prazo: `completed: false, concluido_por: null, concluido_em: null, comentario_conclusao: null`
- Insere comentário: `🔄 Prazo reaberto por [Nome]\n\nMotivo: [motivo]`
- Refetch deadlines

### 3. `AgendaContent.tsx` — Dialog de detalhes (linhas 1600-1631)

No dialog de detalhes (`isDetailDialogOpen`), para prazos concluídos:
- Substituir a área de ações (que hoje só mostra "Excluir") por: "Marcar como Pendente" + "Editar" + "Excluir"

### 4. `AgendaContent.tsx` — Fluxo de re-conclusão

Ao editar um prazo que foi reaberto, ao salvar a edição, o fluxo normal já existe: o botão "Marcar como Concluído" reaparece (pois o prazo volta a ser `completed: false`), exigindo novo comentário de conclusão.

### 5. `DeadlineDetailDialog.tsx` — Mesma lógica para o standalone

Adicionar as mesmas opções no `DeadlineDetailDialog`:
- Botão "Marcar como Pendente" com `AlertDialog` para comentário
- Botão "Editar" que abre o `EditarPrazoDialog`
- Handler de reopen com insert em `deadline_comentarios`

### 6. Novo `AlertDialog` para reabertura (em ambos os componentes)

```tsx
<AlertDialog open={!!reopenDeadlineId} onOpenChange={...}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Reabrir Prazo</AlertDialogTitle>
      <AlertDialogDescription>
        Descreva o motivo para reabrir este prazo. O comentário será registrado no histórico.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <Textarea value={reopenMotivo} onChange={...} placeholder="Motivo da reabertura..." />
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleReopenDeadline} disabled={!reopenMotivo.trim()}>
        Confirmar Reabertura
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Resumo de arquivos

| Arquivo | Mudança |
|---------|---------|
| `AgendaContent.tsx` | Expandir 3 pontinhos para concluídos, novo estado/handler reopen, AlertDialog reopen, ações no detail dialog |
| `DeadlineDetailDialog.tsx` | Adicionar botões Editar + Reabrir para concluídos, import EditarPrazoDialog, handler reopen com comentário |

Sem mudanças no banco de dados. A tabela `deadline_comentarios` já existe e é usada para registrar ações.

