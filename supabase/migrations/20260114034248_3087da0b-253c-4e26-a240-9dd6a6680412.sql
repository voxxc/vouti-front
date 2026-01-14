-- Criar tabela de perfil do advogado para projetos
CREATE TABLE public.project_advogados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  nome_advogado text,
  email_advogado text,
  telefone_advogado text,
  endereco_advogado text,
  cidade_advogado text,
  cep_advogado text,
  logo_url text,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar campo de comentário de conclusão nas etapas
ALTER TABLE public.project_protocolo_etapas 
ADD COLUMN comentario_conclusao text;

-- RLS para project_advogados
ALTER TABLE public.project_advogados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view project_advogados"
ON public.project_advogados FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can insert project_advogados"
ON public.project_advogados FOR INSERT
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can update project_advogados"
ON public.project_advogados FOR UPDATE
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant users can delete project_advogados"
ON public.project_advogados FOR DELETE
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_project_advogados_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_project_advogados_updated_at
BEFORE UPDATE ON public.project_advogados
FOR EACH ROW
EXECUTE FUNCTION public.update_project_advogados_updated_at();