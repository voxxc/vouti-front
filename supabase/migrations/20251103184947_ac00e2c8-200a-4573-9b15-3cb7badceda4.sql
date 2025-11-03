-- Adicionar coluna para vincular projeto ao cliente
ALTER TABLE public.projects 
ADD COLUMN cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX idx_projects_cliente_id ON public.projects(cliente_id);

-- Adicionar comentário
COMMENT ON COLUMN public.projects.cliente_id IS 'Referência ao cadastro completo do cliente';

-- RLS policies para cliente_id
CREATE POLICY "Users can link their own clients to projects"
ON public.projects
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (
  cliente_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM public.clientes 
    WHERE id = cliente_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can link any client to projects"
ON public.projects
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));