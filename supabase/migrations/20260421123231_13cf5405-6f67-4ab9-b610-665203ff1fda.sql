ALTER TABLE public.documentos 
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'documento'
    CHECK (tipo IN ('modelo', 'documento'));

ALTER TABLE public.documentos 
  ADD COLUMN IF NOT EXISTS modelo_origem_id UUID REFERENCES public.documentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_tipo_tenant ON public.documentos(tenant_id, tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON public.documentos(cliente_id) WHERE cliente_id IS NOT NULL;