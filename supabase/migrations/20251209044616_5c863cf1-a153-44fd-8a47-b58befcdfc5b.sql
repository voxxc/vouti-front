-- Criar tabela para historico de request IDs da Judit API
CREATE TABLE oab_request_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oab_id UUID NOT NULL REFERENCES oabs_cadastradas(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  tipo_busca TEXT NOT NULL DEFAULT 'request-document',
  on_demand BOOLEAN DEFAULT false,
  processos_encontrados INTEGER DEFAULT 0,
  processos_novos INTEGER DEFAULT 0,
  processos_atualizados INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  erro_mensagem TEXT,
  user_id UUID,
  tenant_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indices para consultas rapidas
CREATE INDEX idx_oab_request_historico_oab_id ON oab_request_historico(oab_id);
CREATE INDEX idx_oab_request_historico_tenant_id ON oab_request_historico(tenant_id);
CREATE INDEX idx_oab_request_historico_created_at ON oab_request_historico(created_at DESC);

-- RLS
ALTER TABLE oab_request_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver historico do seu tenant"
ON oab_request_historico FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Sistema pode inserir historico"
ON oab_request_historico FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar historico"
ON oab_request_historico FOR UPDATE
USING (true);

CREATE POLICY "Admins podem deletar historico do tenant"
ON oab_request_historico FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_user_tenant_id());