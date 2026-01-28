

## Correção Completa de Comentários no Setor de Acordos

### Problemas Identificados

1. **Apagar/Editar não funciona**: O `TaskModal` no AcordosView não recebe `currentUser` nem `projectId`, impossibilitando operações de CRUD nos comentários
2. **Falta de menções/respostas**: Não existe sistema de resposta/citação a comentários anteriores
3. **Sem real-time multiusuário**: Comentários não atualizam quando outro usuário adiciona/edita/apaga

---

### Solução Técnica

#### Parte 1: Corrigir Passagem de Props no AcordosView

**Arquivo:** `src/pages/AcordosView.tsx`

O `TaskModal` não está recebendo `currentUser` e `projectId`, que são obrigatórios para editar/apagar comentários:

```typescript
// ANTES (linha 477-484)
<TaskModal
  task={selectedTask}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onUpdateTask={handleUpdateTask}
  onRefreshTask={handleRefreshTask}
  columnName={selectedColumnName}
/>

// DEPOIS
<TaskModal
  task={selectedTask}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onUpdateTask={handleUpdateTask}
  onRefreshTask={handleRefreshTask}
  currentUser={currentUser}        // ADICIONAR
  projectId={project.id}           // ADICIONAR
  columnName={selectedColumnName}
/>
```

Também adicionar criação do `currentUser` baseado no `user` da autenticação (similar ao ProjectViewWrapper):

```typescript
// Adicionar hook useAuth e criar currentUser
import { useAuth } from '@/contexts/AuthContext';

// Dentro do componente:
const { user } = useAuth();

const currentUser = {
  id: user?.id || '',
  email: user?.email || '',
  name: user?.user_metadata?.full_name || user?.email || '',
  role: 'advogado' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

---

#### Parte 2: Sistema de Resposta/Citação de Comentários

**2.1 Alteração na Interface Comment**

**Arquivo:** `src/types/project.ts`

```typescript
export interface Comment {
  id: string;
  text: string;
  author: string;
  userId: string;
  replyToId?: string;          // NOVO: ID do comentário sendo respondido
  replyToText?: string;        // NOVO: Preview do texto citado
  replyToAuthor?: string;      // NOVO: Autor do comentário citado
  createdAt: Date;
  updatedAt: Date;
}
```

**2.2 Migração do Banco de Dados**

Adicionar colunas na tabela `task_comments`:

```sql
ALTER TABLE task_comments 
ADD COLUMN reply_to_id UUID REFERENCES task_comments(id) ON DELETE SET NULL,
ADD COLUMN reply_to_text TEXT,
ADD COLUMN reply_to_author TEXT;
```

**2.3 Atualizar TaskModal para Suportar Respostas**

**Arquivo:** `src/components/Project/TaskModal.tsx`

Adicionar estados e lógica de resposta:

```typescript
// Novos estados
const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

// Função para iniciar resposta
const handleReplyComment = (comment: Comment) => {
  setReplyingTo(comment);
  // Opcional: focar no textarea
};

// Função para cancelar resposta
const handleCancelReply = () => {
  setReplyingTo(null);
};

// Modificar handleAddComment para incluir resposta
const handleAddComment = async () => {
  // ... código existente ...
  
  const { data: insertedComment, error } = await supabase
    .from('task_comments')
    .insert({
      task_id: task.id,
      user_id: currentUser.id,
      comment_text: newComment.trim(),
      reply_to_id: replyingTo?.id || null,        // NOVO
      reply_to_text: replyingTo?.text?.slice(0, 100) || null,  // NOVO
      reply_to_author: replyingTo?.author || null  // NOVO
    })
    .select()
    .single();
    
  // Limpar estado de resposta após envio
  setReplyingTo(null);
  // ... resto do código ...
};
```

**2.4 UI de Resposta no TaskModal**

Adicionar botão "Responder" e preview da citação:

```tsx
// Botão Responder junto aos botões de Editar/Apagar
<Button
  variant="ghost"
  size="icon"
  onClick={() => handleReplyComment(comment)}
  className="h-6 w-6"
  title="Responder"
>
  <Reply className="h-3 w-3" />
</Button>

// Preview de citação acima do textarea quando respondendo
{replyingTo && (
  <div className="bg-muted/50 border-l-2 border-primary p-2 rounded text-xs mb-2 flex justify-between items-start">
    <div>
      <span className="font-medium">{replyingTo.author}</span>
      <p className="text-muted-foreground line-clamp-2">{replyingTo.text}</p>
    </div>
    <Button variant="ghost" size="icon" onClick={handleCancelReply} className="h-5 w-5">
      <X className="h-3 w-3" />
    </Button>
  </div>
)}

// Exibir citação no comentário renderizado
{comment.replyToId && (
  <div className="bg-muted/30 border-l-2 border-muted-foreground/30 p-2 rounded text-xs mb-2">
    <span className="font-medium text-muted-foreground">{comment.replyToAuthor}</span>
    <p className="text-muted-foreground line-clamp-1">{comment.replyToText}</p>
  </div>
)}
```

---

#### Parte 3: Real-time Multiusuário

**Arquivo:** `src/components/Project/TaskModal.tsx`

Adicionar subscription Supabase Realtime para `task_comments`:

```typescript
// Dentro do useEffect que carrega dados
useEffect(() => {
  if (!task || !isOpen) return;

  loadTaskData();

  // Subscription para comentários em tempo real
  const channel = supabase
    .channel(`task-comments-${task.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',  // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${task.id}`
      },
      (payload) => {
        // Recarregar dados quando houver mudança
        loadTaskData();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [task?.id, isOpen]);
```

---

#### Parte 4: Carregar Dados de Resposta

**Arquivo:** `src/components/Project/TaskModal.tsx`

Atualizar `loadTaskData` para mapear campos de resposta:

```typescript
comments: (comments || []).map(c => ({
  id: c.id,
  text: c.comment_text,
  author: profileMap.get(c.user_id) || 'Usuario',
  userId: c.user_id,
  replyToId: c.reply_to_id,           // NOVO
  replyToText: c.reply_to_text,       // NOVO
  replyToAuthor: c.reply_to_author,   // NOVO
  createdAt: new Date(c.created_at),
  updatedAt: new Date(c.updated_at)
})),
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/AcordosView.tsx` | Adicionar `currentUser` e `projectId` no TaskModal |
| `src/types/project.ts` | Adicionar campos `replyToId`, `replyToText`, `replyToAuthor` |
| `src/components/Project/TaskModal.tsx` | UI de resposta + real-time subscription |
| **Migração SQL** | Adicionar colunas de resposta na `task_comments` |

---

### Resultado Esperado

- Editar e apagar comentários funcionando no setor de acordos
- Botão "Responder" em cada comentário para criar citação
- Comentários com citação exibem preview do texto original
- Atualização automática em tempo real quando outro usuário adiciona/edita/apaga comentários
- Sem necessidade de fechar/reabrir modal para ver mudanças

