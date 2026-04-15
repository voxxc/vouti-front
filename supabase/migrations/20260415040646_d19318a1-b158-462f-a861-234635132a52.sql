
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'project_update', 'task_moved', 'task_created', 'mention', 
    'comment_added', 'comment_mention', 'deadline_assigned', 
    'deadline_tagged', 'project_added', 'conversation_transferred', 
    'planejador_chat_message', 'processo_processado', 'andamento_processo'
  )
);

ALTER TABLE public.processos_oab ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMPTZ DEFAULT NULL;
