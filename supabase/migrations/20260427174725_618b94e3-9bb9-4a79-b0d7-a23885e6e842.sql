-- Remover agendamento anterior se existir (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'processo-import-worker-1min') THEN
    PERFORM cron.unschedule('processo-import-worker-1min');
  END IF;
END $$;

-- Agendar worker a cada 1 minuto
SELECT cron.schedule(
  'processo-import-worker-1min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/processo-import-worker',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldGpteXJlbGhpanh5b3pjZXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDUzMzMsImV4cCI6MjA3NDQ4MTMzM30.Y56IBouvHNKltauvtsg_bOyhaMUEii_2nwmn2tJIrZo"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);