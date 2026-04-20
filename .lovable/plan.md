

## Corrigir: mensagem apagada no chat do Planejador volta após segundos

### Causa raiz
A tabela `planejador_task_messages` tem RLS habilitada mas **não tem política de DELETE**. Resultado:
- `supabase.from('planejador_task_messages').delete().eq('id', ...)` retorna **sem erro**, mas com **0 linhas afetadas** (RLS bloqueia silenciosamente).
- O `onSuccess` da mutation dispara → toast "Mensagem apagada" aparece.
- A UI otimista esconde a mensagem.
- 5 segundos depois, o `refetchInterval: 5000` do React Query refaz o SELECT e a mensagem **reaparece** (porque nunca foi deletada de verdade).

Mesmo problema potencial em `planejador_task_subtasks` se houver delete — mas o foco aqui é o chat.

### Correção

**1. Adicionar política RLS de DELETE em `planejador_task_messages`:**
- Usuário pode apagar **somente as próprias mensagens** dentro do mesmo tenant:
  ```sql
  CREATE POLICY "Users can delete their own messages"
  ON public.planejador_task_messages
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());
  ```

**2. Adicionar política RLS de UPDATE (mesma tabela)** — a mutation `updateMessage` (editar mensagem) sofre do mesmíssimo problema silencioso. Aproveitar a migration:
  ```sql
  CREATE POLICY "Users can update their own messages"
  ON public.planejador_task_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id())
  WITH CHECK (user_id = auth.uid() AND tenant_id = get_user_tenant_id());
  ```

**3. Endurecer a mutation no frontend** (`PlanejadorTaskChat.tsx`) para detectar "delete fantasma" no futuro:
- Trocar `.delete().eq('id', messageId)` por `.delete().eq('id', messageId).select()` — com `.select()` o Supabase retorna as linhas deletadas. Se vier array vazio, lançamos erro explícito ("Sem permissão para apagar"), o que aciona o `onError`, faz rollback otimista e mostra toast de erro real em vez de fingir sucesso.
- Mesma proteção no `updateMessage` (`.select()` + verificação de retorno vazio).

### Arquivos afetados

- **Nova migration**: 2 políticas RLS (DELETE + UPDATE) em `planejador_task_messages`.
- **`src/components/Planejador/PlanejadorTaskChat.tsx`**: ajustar `deleteMessage.mutationFn` e `updateMessage.mutationFn` para usar `.select()` e validar linhas retornadas.

### Impacto

- **Usuário final (UX)**: apagar mensagem agora funciona de verdade — some imediatamente (otimista) e **não volta mais** após 5s. Editar mensagem (lápis) também passa a persistir. Se um dia a permissão falhar, aparece toast de erro claro em vez de "sucesso" mentiroso.
- **Dados**: nenhuma migração de dados. Apenas 2 policies novas. Mensagens só podem ser apagadas/editadas pelo autor (`user_id = auth.uid()`), respeitando isolamento de tenant. Sem cascata, sem perda de histórico de outros usuários.
- **Riscos colaterais**: nenhum — políticas restritivas (autor + mesmo tenant). Admins do tenant não ganham poder de apagar mensagens alheias por essa migration (se quiser isso depois, é uma policy adicional).
- **Quem é afetado**: todos os usuários que usam o bate-papo de tarefas no Planejador, em todos os tenants. Comportamento correto restaurado.

### Validação

1. Abrir tarefa do Planejador com chat → enviar mensagem própria.
2. Clicar no menu (⋮) → "Apagar" → mensagem some imediatamente.
3. **Aguardar 10 segundos** (passa o ciclo de `refetchInterval`) → mensagem **continua sumida**.
4. Recarregar a página (F5) → mensagem **continua sumida** (deletada de fato no DB).
5. Tentar apagar mensagem de outro usuário (via DevTools forçando o ID) → toast "Erro ao apagar mensagem" + mensagem permanece.
6. Editar mensagem própria → texto novo persiste após reload.

