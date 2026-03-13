ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'project_update', 'task_moved', 'task_created', 'mention',
    'comment_added', 'andamento_processo', 'deadline_assigned',
    'deadline_tagged', 'project_added', 'comment_mention',
    'conversation_transferred'
  ]));