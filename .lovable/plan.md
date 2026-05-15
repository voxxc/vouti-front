# Notificar criador do lead em comentários de reunião

## Causa raiz

O comentário foi salvo, mas Fabieli não recebeu notificação porque **os triggers de notificação ainda não existem** nas tabelas `reuniao_comentarios` e `reuniao_cliente_comentarios`. Hoje só existem os triggers de `updated_at`. O plano anterior foi proposto mas não foi executado — sem trigger, ninguém é notificado quando alguém (que não seja o criador) comenta no lead/reunião.

Além disso, o tipo `'lead_comment'` não está na constraint `notifications_type_check`, então qualquer insert com esse tipo falharia.

## Correção

1. **Estender `notifications_type_check`** para incluir `'lead_comment'`.
2. **Criar `notify_lead_creator_on_reuniao_comentario()`** (`SECURITY DEFINER`, `search_path = public`) — trigger AFTER INSERT em `reuniao_comentarios`:
   - Resolver `cliente_id` via `reunioes.id = NEW.reuniao_id`.
   - Resolver criador via `reuniao_clientes.user_id` onde `id = cliente_id`.
   - Inserir em `notifications` com `type='lead_comment'`, `user_id=criador`, `triggered_by_user_id=NEW.user_id`, `tenant_id=NEW.tenant_id`, `title='Novo comentário no lead'`, `content` com nome do cliente + trecho do comentário.
   - **Pular** se `criador IS NULL` ou `criador = NEW.user_id` (não notificar a si mesmo).
3. **Criar `notify_lead_creator_on_cliente_comentario()`** — análogo, AFTER INSERT em `reuniao_cliente_comentarios`, resolvendo direto via `reuniao_clientes.id = NEW.cliente_id`.
4. **Anexar triggers** `trg_notify_lead_creator_*` nas duas tabelas.

Não há criação de tabela nem mudança de RLS — `notifications` já tem políticas existentes.

## Arquivos afetados

- Nova migração SQL (constraint + 2 funções + 2 triggers).
- Nenhum código frontend muda — `NotificationCenter` já consome `notifications` e renderiza qualquer `type`.

## Impacto

1. **UX**: criador do lead (ex.: Fabieli) recebe sino de notificação sempre que outro usuário comentar na reunião ou ficha do cliente vinculada. Não recebe ao comentar nele mesmo. Mantém `comment_mention` (@) intacto — usuário mencionado E criador podem receber duas notificações distintas, o que é desejado.
2. **Dados**: insere linhas em `notifications` (volume baixo, 1 por comentário). Nenhuma migração destrutiva, nenhuma RLS alterada. Constraint estendida (compatível — só adiciona valor).
3. **Riscos colaterais**: leads antigos sem `user_id` (nulos) simplesmente não geram notificação — sem erro. Comentários do próprio criador não disparam (intencional).
4. **Quem é afetado**: todos os tenants, todos os usuários que cadastram leads. Quem nunca cadastra lead não muda nada.

## Validação

- Comentar como Daniel em reunião de lead criado por Fabieli → Fabieli recebe `lead_comment` no sino.
- Fabieli comentar no próprio lead → nenhuma notificação para ela.
- Mencionar `@Daniel` no comentário → Daniel recebe `comment_mention` (existente) + Fabieli recebe `lead_comment` (novo).
- `select * from notifications where type='lead_comment' order by created_at desc` retorna registros.
- Lead sem `user_id` → comentário salva normalmente, sem erro de trigger.
