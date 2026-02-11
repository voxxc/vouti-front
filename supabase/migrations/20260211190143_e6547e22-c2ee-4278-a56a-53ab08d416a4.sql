
-- Tabela de monitoramentos de publicações
CREATE TABLE public.publicacoes_monitoramentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'PF',
  nome TEXT NOT NULL,
  oab_numero TEXT,
  oab_uf TEXT,
  cpf TEXT,
  abrangencia TEXT NOT NULL DEFAULT 'todos',
  estados_selecionados JSONB,
  quem_recebe_user_id UUID,
  status TEXT NOT NULL DEFAULT 'ativo',
  tribunais_monitorados JSONB,
  data_inicio_monitoramento DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.publicacoes_monitoramentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.publicacoes_monitoramentos FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_insert" ON public.publicacoes_monitoramentos FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_update" ON public.publicacoes_monitoramentos FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_delete" ON public.publicacoes_monitoramentos FOR DELETE USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_publicacoes_monitoramentos_updated_at
  BEFORE UPDATE ON public.publicacoes_monitoramentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de publicações encontradas
CREATE TABLE public.publicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  monitoramento_id UUID REFERENCES public.publicacoes_monitoramentos(id) ON DELETE CASCADE,
  data_disponibilizacao DATE,
  data_publicacao DATE,
  tipo TEXT,
  numero_processo TEXT,
  diario_sigla TEXT,
  diario_nome TEXT,
  comarca TEXT,
  nome_pesquisado TEXT,
  conteudo_completo TEXT,
  link_acesso TEXT,
  status TEXT NOT NULL DEFAULT 'nao_tratada',
  orgao TEXT,
  responsavel TEXT,
  partes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select" ON public.publicacoes FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_insert" ON public.publicacoes FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_update" ON public.publicacoes FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "tenant_delete" ON public.publicacoes FOR DELETE USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_publicacoes_updated_at
  BEFORE UPDATE ON public.publicacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index para evitar duplicatas
CREATE UNIQUE INDEX idx_publicacoes_unique ON public.publicacoes (tenant_id, monitoramento_id, numero_processo, data_disponibilizacao, diario_sigla) WHERE numero_processo IS NOT NULL;

-- Index para buscas frequentes
CREATE INDEX idx_publicacoes_status ON public.publicacoes (tenant_id, status);
CREATE INDEX idx_publicacoes_data ON public.publicacoes (tenant_id, data_disponibilizacao DESC);
