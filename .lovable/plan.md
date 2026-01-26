
## Sistema de Menções (@usuario) em Comentários - Implementação Completa

### Contexto Atual

| Componente | Status | Observação |
|------------|--------|------------|
| `MentionInput` | Existe | Funciona apenas para projetos (usa `project_collaborators`) |
| `project_etapa_comment_mentions` | Existe | Tabela de menções apenas para etapas de protocolo |
| `useEtapaData` | Já tem | Lógica de salvar menções e notificar |
| Outros comentários | Sem suporte | Deadline, Reunião, Parcelas, Tasks, etc. |

### Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPONENTE REUTILIZÁVEL                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  TenantMentionInput                          │   │
│  │  - Busca usuários do TENANT (não só do projeto)             │   │
│  │  - Detecta @nome e mostra sugestões                         │   │
│  │  - Retorna lista de user_ids mencionados                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Agenda      │     │   Reuniões    │     │  Financeiro   │
│   (Deadline)  │     │   (Meeting)   │     │   (Parcelas)  │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

### 1. Migração de Banco de Dados

**Criar tabela genérica de menções:**

```sql
CREATE TABLE IF NOT EXISTS public.comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tipo do comentário (deadline, reuniao, reuniao_cliente, parcela, task)
    comment_type TEXT NOT NULL,
    
    -- ID do comentário (referência flexível)
    comment_id UUID NOT NULL,
    
    -- Usuário mencionado
    mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Quem fez a menção
    mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Multi-tenant
    tenant_id UUID REFERENCES public.tenants(id),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Evitar duplicatas
    UNIQUE(comment_type, comment_id, mentioned_user_id)
);

-- RLS Policies
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.comment_mentions
FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_insert" ON public.comment_mentions
FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_delete" ON public.comment_mentions
FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Índices
CREATE INDEX idx_comment_mentions_type_id ON public.comment_mentions(comment_type, comment_id);
CREATE INDEX idx_comment_mentions_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_tenant ON public.comment_mentions(tenant_id);
```

---

### 2. Componente TenantMentionInput

**Arquivo:** `src/components/Common/TenantMentionInput.tsx`

Diferenças do `MentionInput` existente:
- Busca usuários do **tenant**, não do projeto
- Aceita `tenantId` como prop (ou usa hook `useTenantId`)
- Funciona em qualquer contexto de comentários

**Props:**
```typescript
interface TenantMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (mentionedUserIds: string[]) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  rows?: number;
  // Opcional: filtrar por participantes específicos (ex: de um projeto)
  filterUserIds?: string[];
}
```

**Lógica principal:**
```typescript
// Buscar usuários do tenant
const { data: profiles } = await supabase
  .from('profiles')
  .select('user_id, full_name, avatar_url')
  .eq('tenant_id', tenantId)
  .order('full_name');

// Detecção de @
const handleInputChange = (e) => {
  const textBeforeCursor = value.slice(0, cursorPos);
  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
  // ... mostrar sugestões
};

// Seleção de participante
const handleSelectUser = (user) => {
  const newValue = `${beforeMention}@${user.full_name} ${afterCursor}`;
  // Extrair todas as menções do texto
  const mentionedIds = extractMentions(newValue, users);
  onMentionsChange?.(mentionedIds);
};
```

---

### 3. Hook Utilitário para Menções

**Arquivo:** `src/hooks/useCommentMentions.ts`

```typescript
export const useCommentMentions = () => {
  const { tenantId } = useTenantId();

  // Salvar menções após inserir comentário
  const saveMentions = async (
    commentType: 'deadline' | 'reuniao' | 'reuniao_cliente' | 'parcela' | 'task',
    commentId: string,
    mentionedUserIds: string[]
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Inserir menções
    const inserts = mentionedUserIds.map(userId => ({
      comment_type: commentType,
      comment_id: commentId,
      mentioned_user_id: userId,
      mentioned_by_user_id: user.id,
      tenant_id: tenantId
    }));
    
    await supabase.from('comment_mentions').insert(inserts);
    
    // Enviar notificações
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();
    
    for (const userId of mentionedUserIds) {
      if (userId !== user.id) {
        await supabase.from('notifications').insert({
          user_id: userId,
          triggered_by_user_id: user.id,
          type: 'comment_mention',
          title: 'Você foi mencionado',
          content: `${authorProfile?.full_name || 'Alguém'} mencionou você em um comentário.`,
          tenant_id: tenantId
        });
      }
    }
  };

  return { saveMentions };
};
```

---

### 4. Atualizar Hooks de Comentários

#### A) `useDeadlineComentarios.ts`

```typescript
// Adicionar parâmetro mentionedUserIds
const addComentario = async (
  comentario: string, 
  mentionedUserIds?: string[]
): Promise<boolean> => {
  // ... código existente de insert ...
  
  const { data: insertedComment } = await supabase
    .from('deadline_comentarios')
    .insert({ ... })
    .select()
    .single();
  
  // NOVO: Salvar menções
  if (mentionedUserIds?.length && insertedComment) {
    await saveMentions('deadline', insertedComment.id, mentionedUserIds);
  }
  
  return true;
};
```

#### B) `useReuniaoComentarios.ts`

```typescript
const addComentario = async (
  comentario: string,
  mentionedUserIds?: string[]
) => {
  // ... insert comentário ...
  
  if (mentionedUserIds?.length && insertedComment) {
    await saveMentions('reuniao', insertedComment.id, mentionedUserIds);
  }
};
```

#### C) `useReuniaoClienteComentarios.ts`

```typescript
const addComentario = async (
  comentario: string,
  mentionedUserIds?: string[]
) => {
  // ... insert comentário ...
  
  if (mentionedUserIds?.length && insertedComment) {
    await saveMentions('reuniao_cliente', insertedComment.id, mentionedUserIds);
  }
};
```

---

### 5. Atualizar Componentes de Comentários

#### A) `DeadlineComentarios.tsx`

```typescript
import { TenantMentionInput } from '@/components/Common/TenantMentionInput';

export const DeadlineComentarios = ({ deadlineId, currentUserId }) => {
  const [novoComentario, setNovoComentario] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  
  const handleAddComentario = async () => {
    const success = await addComentario(novoComentario, mentionedUserIds);
    if (success) {
      setNovoComentario('');
      setMentionedUserIds([]);
    }
  };

  return (
    <div className="space-y-4">
      <TenantMentionInput
        value={novoComentario}
        onChange={setNovoComentario}
        onMentionsChange={setMentionedUserIds}
        placeholder="Adicionar comentário... Use @ para mencionar"
      />
      <Button onClick={handleAddComentario}>
        Adicionar Comentário
      </Button>
      {/* ... lista de comentários ... */}
    </div>
  );
};
```

#### B) `ReuniaoComentarios.tsx`

Mesma lógica - substituir `Textarea` por `TenantMentionInput`.

#### C) `ClienteComentariosTab.tsx`

Mesma lógica - substituir `Textarea` por `TenantMentionInput`.

---

### 6. Destacar Menções no Texto

**Criar componente para renderizar comentário com menções destacadas:**

**Arquivo:** `src/components/Common/CommentText.tsx`

```typescript
interface CommentTextProps {
  text: string;
  className?: string;
}

export const CommentText = ({ text, className }: CommentTextProps) => {
  // Regex para encontrar @NomeCompleto
  const mentionRegex = /@([^@\s][^@]*?)(?=\s|$|@)/g;
  
  const parts = text.split(mentionRegex);
  
  return (
    <p className={cn("text-sm whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) => {
        // Partes ímpares são os nomes mencionados
        if (i % 2 === 1) {
          return (
            <span 
              key={i} 
              className="bg-primary/10 text-primary font-medium px-1 rounded"
            >
              @{part}
            </span>
          );
        }
        return part;
      })}
    </p>
  );
};
```

**Uso nos componentes:**
```typescript
// Antes
<p className="text-sm">{comentario.comentario}</p>

// Depois
<CommentText text={comentario.comentario} />
```

---

### 7. Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/xxx_add_comment_mentions.sql` | Criar | Tabela genérica de menções |
| `src/components/Common/TenantMentionInput.tsx` | Criar | Input com autocomplete por tenant |
| `src/components/Common/CommentText.tsx` | Criar | Renderizar texto com menções destacadas |
| `src/hooks/useCommentMentions.ts` | Criar | Hook para salvar menções e notificar |
| `src/hooks/useDeadlineComentarios.ts` | Modificar | Suportar mentionedUserIds |
| `src/hooks/useReuniaoComentarios.ts` | Modificar | Suportar mentionedUserIds |
| `src/hooks/useReuniaoClienteComentarios.ts` | Modificar | Suportar mentionedUserIds |
| `src/hooks/useClienteParcelas.ts` | Modificar | Suportar mentionedUserIds (parcela comments) |
| `src/components/Agenda/DeadlineComentarios.tsx` | Modificar | Usar TenantMentionInput |
| `src/components/Reunioes/ReuniaoComentarios.tsx` | Modificar | Usar TenantMentionInput |
| `src/components/Reunioes/ClienteComentariosTab.tsx` | Modificar | Usar TenantMentionInput |
| `src/components/Financial/ParcelaComentarios.tsx` | Modificar | Usar TenantMentionInput |

---

### 8. Fluxo de Notificação

```text
┌──────────────────────────────────────────────────────────────────┐
│ Usuário digita "@" no comentário                                 │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ TenantMentionInput mostra lista de usuários do tenant           │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Usuário seleciona nome → "@João Silva" inserido                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Ao enviar comentário:                                            │
│ 1. INSERT em {type}_comentarios                                  │
│ 2. INSERT em comment_mentions (para cada @mencionado)            │
│ 3. INSERT em notifications (para cada @mencionado)               │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Usuário mencionado vê notificação:                               │
│ "João mencionou você em um comentário"                           │
└──────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

1. **Menções funcionando em todos os comentários** - Agenda, Reuniões, Parcelas, etc.
2. **Autocomplete de usuários** - Ao digitar `@`, aparece lista do tenant
3. **Notificações automáticas** - Usuário mencionado recebe notificação
4. **Destaque visual** - Menções aparecem em cor diferente no texto
5. **Consistência** - Mesmo comportamento em todos os módulos

---

### Seção Técnica

**Regex para extrair menções:**
```typescript
const mentionRegex = /@([^@\s][^@]*?)(?=\s|$|@)/g;
// Captura: @João Silva, @Maria, @Ana Clara
```

**Estrutura da tabela:**
```sql
comment_mentions
├── id (UUID PK)
├── comment_type (TEXT) -- 'deadline', 'reuniao', 'task', etc.
├── comment_id (UUID) -- ID do comentário original
├── mentioned_user_id (UUID FK → auth.users)
├── mentioned_by_user_id (UUID FK → auth.users)
├── tenant_id (UUID FK → tenants)
└── created_at (TIMESTAMPTZ)
```

**Query para buscar usuários do tenant:**
```typescript
const { data: users } = await supabase
  .from('profiles')
  .select('user_id, full_name, avatar_url')
  .eq('tenant_id', tenantId)
  .neq('user_id', currentUserId) // Não mostrar o próprio usuário
  .order('full_name');
```
