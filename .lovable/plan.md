## Causa raiz

Quando um usuário é mencionado (`@`) em um comentário de prazo:

- A política RLS de `deadlines` **já permite** o acesso via `is_mentioned_in_deadline(id, auth.uid())` — por isso o Wesley consegue **abrir** o prazo pela notificação.
- A política RLS de `deadline_comentarios` (`Users can view deadline comments`) **NÃO inclui** essa verificação. Só liberam leitura para: autor do comentário, dono/advogado do prazo, usuário em `deadline_tags`, membro do projeto ou admin.

Resultado: o mencionado abre o prazo, mas a query de comentários retorna vazia (RLS bloqueia silenciosamente). Daí ele vê o prazo mas não vê nenhum comentário — nem o que o mencionou.

## Correção

Migration única para recriar a policy SELECT de `deadline_comentarios` adicionando o ramo de menção:

```sql
DROP POLICY "Users can view deadline comments" ON public.deadline_comentarios;

CREATE POLICY "Users can view deadline comments"
ON public.deadline_comentarios
FOR SELECT
USING (
  tenant_id IS NOT NULL
  AND tenant_id = get_user_tenant_id()
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM deadlines d
      WHERE d.id = deadline_comentarios.deadline_id
        AND (d.user_id = auth.uid()
             OR d.advogado_responsavel_id = auth.uid()
             OR is_tagged_in_deadline(d.id, auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM deadlines d
      JOIN projects p ON p.id = d.project_id
      WHERE d.id = deadline_comentarios.deadline_id
        AND is_project_member(p.id, auth.uid())
    )
    -- NOVO: usuário mencionado em qualquer comentário do prazo
    OR is_mentioned_in_deadline(deadline_comentarios.deadline_id, auth.uid())
    OR has_role_in_tenant(auth.uid(), 'admin', get_user_tenant_id())
  )
);
```

A função `is_mentioned_in_deadline` já existe e é `SECURITY DEFINER`, então não há recursão de RLS.

Nenhuma alteração de frontend é necessária: o fluxo de notificação → abrir prazo → ler comentários já está implementado e funcional; o que falta é só a permissão de leitura.

## Arquivos afetados

- **Nova migration** em `supabase/migrations/` recriando a policy `Users can view deadline comments`.
- Nenhum arquivo de código TypeScript precisa ser alterado.

## Impacto

1. **UX (usuário final):** quem for `@mencionado` num comentário de prazo passa a ver **todos** os comentários daquele prazo ao abri-lo pela notificação. O fluxo "notificação → prazo aberto → comentários visíveis" funciona para qualquer tenant.
2. **Dados:** apenas troca de policy. Sem migração de dados, sem schema novo, sem mexer em índices. Performance praticamente idêntica (a função já é usada na policy de `deadlines`).
3. **Riscos colaterais:** mínimo. O acesso de leitura aos comentários se amplia exatamente na mesma medida em que já se amplia o acesso ao próprio prazo (que já libera via menção). Não há vazamento entre tenants — o filtro `tenant_id = get_user_tenant_id()` permanece como gate obrigatório.
4. **Quem é afetado:** todos os usuários de todos os tenants. Wesley passa a enxergar o comentário que o mencionou. Admins, donos, advogados, tagueados e membros de projeto continuam vendo como antes.

## Validação

1. Aplicar a migration.
2. Como usuário **não-admin**, **não-dono** e **não-tagueado** do prazo, mas mencionado em um comentário: clicar na notificação `comment_mention` → o `DeadlineDetailDialog` deve abrir e a aba "Comentários" deve listar os comentários (em especial o que contém a menção).
3. Conferir que usuários **fora** do tenant continuam sem acesso (sanidade de isolamento).
4. Conferir que um usuário sem nenhum vínculo nem menção **continua** sem ver comentários.