ALTER TABLE public.planejador_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_files REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_subtasks REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_etapas REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_participants REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_labels REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_label_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.planejador_task_activity_log REPLICA IDENTITY FULL;
ALTER TABLE public.task_comentarios REPLICA IDENTITY FULL;
ALTER TABLE public.task_tarefas REPLICA IDENTITY FULL;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'planejador_tasks',
    'planejador_task_files',
    'planejador_task_subtasks',
    'planejador_task_etapas',
    'planejador_task_participants',
    'planejador_task_labels',
    'planejador_task_label_assignments',
    'planejador_task_activity_log',
    'task_comentarios',
    'task_tarefas'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END$$;