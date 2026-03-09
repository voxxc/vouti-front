-- Add whatsapp_sync_signals to Realtime publication so Supabase broadcasts INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_sync_signals;