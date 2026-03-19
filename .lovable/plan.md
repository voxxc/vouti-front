

# Fix: Notificações antigas de protocolo não funcionam (dados incompletos)

## Diagnóstico

A notificação que você clicou foi criada **antes** da correção. Ela tem:
- `title: "Mencionado em tarefa"` (genérico, não "protocolo")
- `related_project_id: null` (não foi salvo)

O `getCommentMentionTarget` procura a palavra "protocolo" no título/conteúdo, mas encontra "tarefa" — então não entra na lógica de protocolo. E mesmo que entrasse, `related_project_id` é null, impedindo a navegação.

**Novas notificações criadas após a correção já funcionam corretamente** (testei verificando o código: `commentType="protocolo"`, `relatedProjectId` é passado). O problema é só com dados antigos.

## Solução

Adicionar fallback inteligente no `NotificationCenter.tsx`: quando `related_project_id` é null e o clique não foi tratado por nenhuma rota específica, tentar buscar no `project_protocolos` usando `related_task_id` como possível protocolo ID. Se encontrar, abrir via `onProtocoloNavigation`.

### Arquivo: `NotificationCenter.tsx`

No final de `handleNotificationClick`, antes do fallback genérico (linha ~170), adicionar:

```typescript
// Fallback: se related_project_id é null mas related_task_id existe,
// tentar resolver como protocolo (compatibilidade com notificações antigas)
if (!notification.related_project_id && notification.related_task_id && onProtocoloNavigation) {
  try {
    const { data } = await supabase
      .from('project_protocolos')
      .select('project_id')
      .eq('id', notification.related_task_id)
      .maybeSingle();
    if (data?.project_id) {
      onProtocoloNavigation(data.project_id, notification.related_task_id);
      setIsOpen(false);
      return;
    }
  } catch { /* fall through to default */ }
}
```

Isso resolve tanto notificações antigas quanto qualquer caso futuro onde `related_project_id` não tenha sido preenchido.

### Escopo

| Arquivo | Mudança |
|---------|---------|
| `NotificationCenter.tsx` | Adicionar fallback de lookup antes do handler default |

Uma única alteração de ~15 linhas.

