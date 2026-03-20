

# Fix: Bate-papo da tarefa no Planejador

## Problema identificado

O chat de texto funciona em teoria (tabela, RLS, código estão corretos), mas **faltam storage policies para upload** — o que faz fotos e áudios falharem silenciosamente. Além disso, o código usa `(supabase as any)` desnecessariamente, o que pode mascarar erros de tipo.

## Correções

### 1. Migration — Adicionar policy de INSERT no storage

O bucket `planejador-chat-files` tem policies de SELECT e DELETE, mas **não tem INSERT** (upload). Sem isso, qualquer tentativa de enviar foto ou áudio falha silenciosamente.

```sql
CREATE POLICY "Users upload planejador chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'planejador-chat-files');
```

### 2. PlanejadorTaskChat.tsx — Remover `(supabase as any)` casts

A tabela `planejador_task_messages` já existe no types.ts. Trocar todas as chamadas `(supabase as any).from('planejador_task_messages')` por `supabase.from('planejador_task_messages')` para ter type-safety e erros visíveis.

### 3. Melhorar feedback de erro

Adicionar toast de erro visível ao usuário quando o envio de mensagem, upload de arquivo ou gravação de áudio falhar, em vez de apenas `console.error`.

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Adicionar INSERT policy no storage para `planejador-chat-files` |
| `PlanejadorTaskChat.tsx` | Remover `(supabase as any)`, adicionar toasts de erro |

