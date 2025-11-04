-- ==================== TABELA DE COMENTÁRIOS ====================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);

-- ==================== TABELA DE ARQUIVOS ====================
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_files_task_id ON public.task_files(task_id);

-- ==================== TABELA DE HISTÓRICO ====================
CREATE TABLE IF NOT EXISTS public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at DESC);

-- ==================== STORAGE BUCKET ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- ==================== RLS POLICIES ====================

-- Task Comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible tasks"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_comments.task_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Users can create comments on accessible tasks"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_comments.task_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.task_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.task_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all comments"
  ON public.task_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Task Files
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files on accessible tasks"
  ON public.task_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_files.task_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "Users can upload files to accessible tasks"
  ON public.task_files FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_files.task_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can delete their own files"
  ON public.task_files FOR DELETE
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all files"
  ON public.task_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Task History
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history on accessible tasks"
  ON public.task_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_history.task_id
        AND (
          p.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id AND pc.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
          )
        )
    )
  );

CREATE POLICY "System can create history entries"
  ON public.task_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all history"
  ON public.task_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Storage Policies
CREATE POLICY "Users can view task attachments on accessible projects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'task-attachments'
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_collaborators pc
        WHERE pc.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own task attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger para updated_at
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();