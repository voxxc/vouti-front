

## Correção de Comentários no Setor de Acordos

### Problemas Identificados

1. **Exclusão não funciona**: RLS bloqueia porque não verificamos se o usuário é o autor
2. **Sem feedback de loading**: O botão "Adicionar Comentário" não mostra carregamento
3. **Atualização real-time**: Já funciona via `onUpdateTask`, mas precisa garantir consistência

---

### Solução Técnica

#### 1. Atualizar Interface Comment

**Arquivo:** `src/types/project.ts` (linha 26-32)

```typescript
// ANTES
export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

// DEPOIS
export interface Comment {
  id: string;
  text: string;
  author: string;
  userId: string;      // NOVO: para verificar autoria
  createdAt: Date;
  updatedAt: Date;
}
```

---

#### 2. Mapear userId ao Carregar Comentários

**Arquivo:** `src/components/Project/TaskModal.tsx` (linha 178-184)

```typescript
// ANTES
comments: (comments || []).map(c => ({
  id: c.id,
  text: c.comment_text,
  author: profileMap.get(c.user_id) || 'Usuario',
  createdAt: new Date(c.created_at),
  updatedAt: new Date(c.updated_at)
})),

// DEPOIS
comments: (comments || []).map(c => ({
  id: c.id,
  text: c.comment_text,
  author: profileMap.get(c.user_id) || 'Usuario',
  userId: c.user_id,   // NOVO
  createdAt: new Date(c.created_at),
  updatedAt: new Date(c.updated_at)
})),
```

---

#### 3. Mapear userId ao Criar Comentário

**Arquivo:** `src/components/Project/TaskModal.tsx` (linha 282-288)

```typescript
// ANTES
const comment: Comment = {
  id: insertedComment.id,
  text: insertedComment.comment_text,
  author: currentUser.name || "Usuario Atual",
  createdAt: new Date(insertedComment.created_at),
  updatedAt: new Date(insertedComment.updated_at)
};

// DEPOIS
const comment: Comment = {
  id: insertedComment.id,
  text: insertedComment.comment_text,
  author: currentUser.name || "Usuario Atual",
  userId: currentUser.id,   // NOVO
  createdAt: new Date(insertedComment.created_at),
  updatedAt: new Date(insertedComment.updated_at)
};
```

---

#### 4. Adicionar Estado de Loading

**Arquivo:** `src/components/Project/TaskModal.tsx`

Adicionar estado (após linha 62):
```typescript
const [isAddingComment, setIsAddingComment] = useState(false);
```

Modificar `handleAddComment` (linha 267-330):
```typescript
const handleAddComment = async () => {
  if (newComment.trim() && task && currentUser) {
    setIsAddingComment(true);  // NOVO
    try {
      // ... código existente ...
    } catch (error) {
      // ... código existente ...
    } finally {
      setIsAddingComment(false);  // NOVO
    }
  }
};
```

---

#### 5. Botão com Loading

**Arquivo:** `src/components/Project/TaskModal.tsx` (linha 919-922)

```typescript
// ANTES
<Button onClick={handleAddComment} className="gap-2" size="sm">
  <Plus className="h-3 w-3" />
  Adicionar Comentario
</Button>

// DEPOIS
<Button 
  onClick={handleAddComment} 
  className="gap-2" 
  size="sm"
  disabled={isAddingComment || !newComment.trim()}
>
  {isAddingComment ? (
    <Loader2 className="h-3 w-3 animate-spin" />
  ) : (
    <Plus className="h-3 w-3" />
  )}
  {isAddingComment ? 'Enviando...' : 'Adicionar Comentario'}
</Button>
```

Adicionar import do Loader2 (linha 22):
```typescript
import { Edit, Save, X, Plus, Edit2, Trash2, Link2, ListTodo, MessageSquare, Files, History, Loader2 } from "lucide-react";
```

---

#### 6. Condicionar Botões de Editar/Deletar

**Arquivo:** `src/components/Project/TaskModal.tsx` (linha 960-997)

Mostrar botões apenas para o autor do comentário:

```typescript
// ANTES
<div className="flex gap-1 ml-2">
  <Button variant="ghost" ... onClick={() => handleEditComment(comment.id)}>
    <Edit2 className="h-3 w-3" />
  </Button>
  <AlertDialog>
    ...deletar...
  </AlertDialog>
</div>

// DEPOIS
{currentUser && comment.userId === currentUser.id && (
  <div className="flex gap-1 ml-2">
    <Button variant="ghost" ... onClick={() => handleEditComment(comment.id)}>
      <Edit2 className="h-3 w-3" />
    </Button>
    <AlertDialog>
      ...deletar...
    </AlertDialog>
  </div>
)}
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/types/project.ts` | Adicionar `userId` na interface Comment |
| `src/components/Project/TaskModal.tsx` | Loading no botão + verificação de autoria |

---

### Resultado Esperado

- Botão de adicionar mostra spinner durante envio
- Comentário aparece instantaneamente após envio (real-time via state)
- Apenas o autor vê os botões de editar/deletar
- Exclusão funciona corretamente (RLS satisfeita)

