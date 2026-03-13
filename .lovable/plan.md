

# Correção: Menções em comentários de prazos não geram notificações

## Causa raiz

O regex de extração de menções em `TenantMentionInput.tsx` está quebrado para nomes com espaço (maioria dos nomes):

```typescript
const mentionRegex = /@([^@\s][^@]*?)(?=\s|$|@)/g;
```

O quantificador lazy `*?` para no **primeiro espaço** encontrado. Para `@João Silva`, captura apenas `"João"`, que nunca bate com `full_name = "João Silva"`. Resultado: `mentionedUserIds` fica sempre vazio → `saveMentions` nunca é chamado → nenhuma notificação é criada.

## Correção

### 1. `src/components/Common/TenantMentionInput.tsx` — Corrigir `extractMentions`

Trocar a abordagem do regex. Em vez de tentar parsear com regex genérico, iterar sobre os usuários conhecidos e verificar se o texto contém `@NomeCompleto`:

```typescript
const extractMentions = useCallback((text: string): string[] => {
  if (!text || !users.length) return [];
  const mentions: string[] = [];
  for (const user of users) {
    if (!user.full_name) continue;
    const pattern = `@${user.full_name}`;
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      mentions.push(user.user_id);
    }
  }
  return [...new Set(mentions)];
}, [users]);
```

### 2. `src/hooks/useCommentMentions.ts` — Remover `as any` desnecessário

A tabela `comment_mentions` já existe nos types. Remover os casts `as any` para melhor type-safety e detecção de erros.

### 3. `src/components/Communication/NotificationCenter.tsx` — Adicionar ícone para `comment_mention`

Adicionar case `comment_mention` no switch de ícones para exibir 💬 (ou 👤), garantindo que a notificação apareça com visual correto.

### 4. `src/hooks/useNotifications.ts` — Incluir `comment_mention` no type union

Adicionar `'comment_mention'` ao union type de `Notification['type']` para consistência.

### Arquivos
- `src/components/Common/TenantMentionInput.tsx` — corrigir extractMentions
- `src/hooks/useCommentMentions.ts` — remover `as any`
- `src/components/Communication/NotificationCenter.tsx` — ícone comment_mention
- `src/hooks/useNotifications.ts` — type union

