

## Plano: Criar Cron Job para Automação de Mensagens

### Objetivo

Configurar um cron job que executa a cada 1 minuto para processar a fila de mensagens pendentes (`whatsapp_pending_messages`), garantindo que leads recebam a mensagem de boas-vindas em no máximo 60 segundos após o cadastro.

---

### Migração SQL

```sql
-- Criar cron job para processar fila de mensagens WhatsApp a cada 1 minuto
SELECT cron.schedule(
  'whatsapp-process-queue-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/whatsapp-process-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldGpteXJlbGhpanh5b3pjZXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDUzMzMsImV4cCI6MjA3NDQ4MTMzM30.Y56IBouvHNKltauvtsg_bOyhaMUEii_2nwmn2tJIrZo'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

### Fluxo Automatizado

```
LEAD CADASTRA NA HOMEPAGE
        │
        ▼
┌─────────────────────────────────────┐
│  INSERT em landing_leads            │
│  Trigger adiciona à fila            │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  CRON JOB (a cada minuto)           │
│  → Chama whatsapp-process-queue     │
│  → Processa mensagens pendentes     │
│  → Envia via Z-API                  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  LEAD RECEBE MENSAGEM               │
│  (0-60 segundos após cadastro)      │
└─────────────────────────────────────┘
```

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| Mensagens ficam paradas na fila | Processamento automático a cada minuto |
| Precisa chamar manualmente | 100% automatizado |
| Lead não recebe mensagem | Lead recebe em até 60 segundos |

---

### Arquivo a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/[timestamp]_create_whatsapp_cron_job.sql` | Migração com o cron.schedule() |

