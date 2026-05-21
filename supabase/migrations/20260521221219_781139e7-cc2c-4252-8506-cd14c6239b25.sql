
-- Tabela de jobs para teste assíncrono de publicação via CNJ
CREATE TABLE public.publicacao_test_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  numero_cnj TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  publicacao_id UUID,
  storage_path TEXT,
  attachment_name TEXT,
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publicacao_test_jobs_created ON public.publicacao_test_jobs (created_at DESC);

ALTER TABLE public.publicacao_test_jobs ENABLE ROW LEVEL SECURITY;

-- Apenas super-admins podem ver/criar/editar
CREATE POLICY "Super admins can view test jobs"
  ON public.publicacao_test_jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can insert test jobs"
  ON public.publicacao_test_jobs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_publicacao_test_jobs_updated_at
  BEFORE UPDATE ON public.publicacao_test_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.publicacao_test_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publicacao_test_jobs;
