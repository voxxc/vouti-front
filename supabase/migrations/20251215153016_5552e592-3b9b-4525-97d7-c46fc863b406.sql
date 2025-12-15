-- Tabela de pagamentos mensais de colaboradores
CREATE TABLE public.colaborador_pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  mes_referencia DATE NOT NULL,
  salario_base DECIMAL(10,2) NOT NULL,
  descontos DECIMAL(10,2) DEFAULT 0,
  acrescimos DECIMAL(10,2) DEFAULT 0,
  valor_liquido DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  metodo_pagamento VARCHAR(50),
  comprovante_url TEXT,
  observacoes TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(colaborador_id, mes_referencia)
);

-- Enable RLS
ALTER TABLE public.colaborador_pagamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies (padrao 4 policies)
CREATE POLICY "colaborador_pagamentos_tenant_select" ON public.colaborador_pagamentos
FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_pagamentos_tenant_insert" ON public.colaborador_pagamentos
FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_pagamentos_tenant_update" ON public.colaborador_pagamentos
FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "colaborador_pagamentos_tenant_delete" ON public.colaborador_pagamentos
FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_colaborador_pagamentos_updated_at
BEFORE UPDATE ON public.colaborador_pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();