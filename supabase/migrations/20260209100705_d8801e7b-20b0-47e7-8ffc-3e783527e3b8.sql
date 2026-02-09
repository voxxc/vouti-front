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