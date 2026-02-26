

## Problema: Campanha em massa nunca é processada

### Causa raiz

A Edge Function `whatsapp-process-campaigns` **nunca é invocada**. Existe um cron job (`pg_cron`) para `whatsapp-process-queue` (a cada minuto), mas **nenhum cron para `whatsapp-process-campaigns`**. A função está deployada mas ninguém a chama.

Além disso, a campanha atual (id `3475ba7a`) está com status `paused` e todas as 11 mensagens estão com status `cancelled` — resultado de ter sido pausada manualmente. Mesmo que o cron existisse, não processaria nada nesse estado.

### Correções

**1. Criar cron job para `whatsapp-process-campaigns`** (SQL migration)

Adicionar um `pg_cron` job que invoque a função a cada minuto, igual ao padrão do `whatsapp-process-queue`:

```sql
SELECT cron.schedule(
  'whatsapp-process-campaigns-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-process-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <anon_key>'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**2. Corrigir o `supabase.rpc('', {})` inútil** na Edge Function (linha 114)

Essa chamada `supabase.rpc('', {})` não faz nada e gera um erro silencioso. Remover essa linha.

### Arquivos afetados

| Arquivo / Recurso | Mudança |
|---|---|
| SQL Migration (pg_cron) | Criar cron job para invocar `whatsapp-process-campaigns` a cada minuto |
| `supabase/functions/whatsapp-process-campaigns/index.ts` | Remover `supabase.rpc('', {}).catch(() => {})` (linha 114) |

