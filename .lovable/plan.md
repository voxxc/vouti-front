

## Plano: Substituir botão de excluir por menu de 3 pontinhos (MoreVertical)

### Mudança

No `DeadlineDetailDialog.tsx`, na área de ações (linhas 436-466), substituir o botão de excluir (Trash2) por um `DropdownMenu` com ícone de 3 pontinhos (`MoreVertical`). O dropdown terá duas opções:

1. **Editar prazo** — abre o `EditarPrazoDialog` (já existe no componente)
2. **Excluir prazo** — abre o `AlertDialog` de confirmação de exclusão (já existe)

O botão "Editar" que hoje só aparece quando o prazo está concluído (linha 447-451) será removido de lá e passará a estar **sempre disponível** dentro do menu de 3 pontinhos.

### Arquivo alterado

**`src/components/Agenda/DeadlineDetailDialog.tsx`**

- Importar `MoreVertical` do lucide-react e componentes `DropdownMenu*` do shadcn
- Linhas 436-466: reorganizar para:
  - Botão "Marcar como Concluído" ou "Marcar como Pendente" (mantém como está)
  - Botão `MoreVertical` com `DropdownMenu` contendo:
    - Item "Editar" → `setIsEditDialogOpen(true)`
    - Item "Excluir" (vermelho) → abre AlertDialog de exclusão
- Remover o botão Editar standalone (linhas 447-451)

### Layout final dos botões

```text
[ Marcar como Concluído (flex-1) ]  [ ⋮ ]
                                      ├─ Editar
                                      └─ Excluir prazo
```

