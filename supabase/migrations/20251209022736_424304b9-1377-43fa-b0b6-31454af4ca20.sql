-- Tabela para registrar todas as chamadas POST para Judit API
CREATE TABLE public.judit_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  oab_id UUID REFERENCES public.oabs_cadastradas(id) ON DELETE SET NULL,
  
  -- Tipo de chamada
  tipo_chamada TEXT NOT NULL, -- 'request-document' | 'lawsuit_cnj' | 'tracking'
  endpoint TEXT NOT NULL,
  metodo TEXT NOT NULL DEFAULT 'POST',
  
  -- Dados da requisicao
  request_payload JSONB,
  request_id TEXT,
  
  -- Resultado
  sucesso BOOLEAN DEFAULT false,
  resposta_status INTEGER,
  erro_mensagem TEXT,
  
  -- Custo estimado (em reais)
  custo_estimado NUMERIC(10,4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX idx_judit_logs_tenant ON public.judit_api_logs(tenant_id);
CREATE INDEX idx_judit_logs_created ON public.judit_api_logs(created_at DESC);
CREATE INDEX idx_judit_logs_tipo ON public.judit_api_logs(tipo_chamada);

-- RLS
ALTER TABLE public.judit_api_logs ENABLE ROW LEVEL SECURITY;

-- Super admins podem ver todos os logs
CREATE POLICY "Super admins can view all judit logs"
ON public.judit_api_logs
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Sistema pode inserir logs (via service role)
CREATE POLICY "System can insert judit logs"
ON public.judit_api_logs
FOR INSERT
WITH CHECK (true);

-- Sistema pode atualizar logs
CREATE POLICY "System can update judit logs"
ON public.judit_api_logs
FOR UPDATE
USING (true);