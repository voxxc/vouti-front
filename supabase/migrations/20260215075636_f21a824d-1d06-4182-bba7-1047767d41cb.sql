SELECT cron.schedule(
  'djen-oab-daily-8h-brt',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/buscar-publicacoes-pje',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlldGpteXJlbGhpanh5b3pjZXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDUzMzMsImV4cCI6MjA3NDQ4MTMzM30.Y56IBouvHNKltauvtsg_bOyhaMUEii_2nwmn2tJIrZo"}'::jsonb,
    body := '{"mode": "pje_scraper_oab"}'::jsonb
  ) AS request_id;
  $$
);