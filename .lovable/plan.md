# Wesley não consegue abrir prazo mencionado

## Causa raiz

Wesley (perito) recebeu notificação `comment_mention` no prazo `a096694f-...` ("SOLICITAR DOCUMENTOS SANTANDER"). Ao clicar, o `DeadlineDetailDialog` faz `select().eq('id', id).single()` e recebe **PGRST116 (0 rows)** — confirmado nos logs do console.

A política RLS de SELECT em `public.deadlines` exige:

```
auth.uid() = user_id
OR auth.uid() = advogado_responsavel_id
OR auth.uid() = concluido_por
OR is_tagged_in_deadline(id, auth.uid())
```

Verifiquei no banco: Wesley **não é** criador, advogado, concluidor nem está em `deadline_tags` desse prazo. Ele apenas foi `@mencionado` num comentário (`comment_mentions` + `deadline_comentarios`). Logo, a notificação leva a um diálogo vazio (só a barra de loading some e nada aparece).

Esse buraco afeta **qualquer usuário de qualquer tenant** que receba menção em comentário sem ter outro vínculo com o prazo.

## Correção

1. Criar função `public.is_mentioned_in_deadline(p_deadline_id uuid, p_user_id uuid) RETURNS boolean` `SECURITY DEFINER` `STABLE` (`search_path = public`) que retorna `EXISTS` em `comment_mentions cm JOIN deadline_comentarios dc ON dc.id = cm.comment_id` filtrando `cm.comment_type = 'deadline'`, `dc.deadline_id = p_deadline_id`, `cm.mentioned_user_id = p_user_id`.

2. Recriar políticas em `public.deadlines`:
   - **SELECT** "Users can view deadlines in tenant" — adicionar `OR public.is_mentioned_in_deadline(id, auth.uid())`.
   - **UPDATE** "Users can update their deadlines in tenant" — **não alterar** (mencionado lê, mas não edita; apenas tagged/advogado/criador editam).

3. Frontend: no `DeadlineDetailDialog.fetchDeadline`, quando vier `PGRST116`, exibir um toast amigável "Você não tem mais acesso a este prazo" e fechar o diálogo, em vez de deixar a barra fantasma.

## Arquivos afetados

- **Nova migration** — função `is_mentioned_in_deadline` + recriação da policy SELECT.
- `src/components/Agenda/DeadlineDetailDialog.tsx` — tratamento de erro/fechamento quando não encontrar.

## Impacto

1. **Usuário final**: usuários mencionados em comentários de prazos passam a abrir o detalhe normalmente ao clicar na notificação. Permanece leitura somente (não podem editar/excluir/concluir, mantendo o controle existente).
2. **Dados**: nenhuma mudança de schema. Apenas nova função `SECURITY DEFINER` e troca da policy SELECT. Performance: a função usa join indexado por `comment_id` e `deadline_id` (índices existentes), custo desprezível por linha avaliada — RLS chama por linha apenas quando as outras condições falham (short-circuit `OR`).
3. **Riscos colaterais**: a policy expande visibilidade — qualquer usuário mencionado em qualquer comentário do prazo passa a ver todos os campos do prazo (incluindo `comentario_conclusao` etc.). Isso é o comportamento esperado, já que ele foi explicitamente mencionado. Não afeta isolamento de tenant (a policy mantém `tenant_id = get_user_tenant_id()`).
4. **Quem é afetado**: todos os tenants e todos os roles abaixo de admin/controller que sejam mencionados em comentários de prazo.

## Validação

- Logar como Wesley, clicar na notificação `a096694f-...` → diálogo carrega título "SOLICITAR DOCUMENTOS SANTANDER", aba comentários mostra a menção.
- Tentar editar/excluir/concluir → bloqueado pelas policies de UPDATE/DELETE (esperado).
- Conferir isolamento: usuário de outro tenant **não** vê o prazo mesmo se constar em `comment_mentions` (a checagem `tenant_id = get_user_tenant_id()` permanece como AND externo).
- Reabrir notificação antiga sem permissão (caso o comment seja deletado): o frontend mostra toast e fecha.
