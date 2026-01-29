-- Add new columns to tenant_boletos for configurable payment methods
ALTER TABLE public.tenant_boletos 
ADD COLUMN IF NOT EXISTS metodos_disponiveis TEXT[] DEFAULT ARRAY['boleto', 'pix'],
ADD COLUMN IF NOT EXISTS link_cartao TEXT DEFAULT NULL;

-- Update the constraint on tenant_pagamento_confirmacoes to accept 'cartao'
ALTER TABLE public.tenant_pagamento_confirmacoes 
DROP CONSTRAINT IF EXISTS tenant_pagamento_confirmacoes_metodo_check;

ALTER TABLE public.tenant_pagamento_confirmacoes 
ADD CONSTRAINT tenant_pagamento_confirmacoes_metodo_check 
CHECK (metodo IN ('pix', 'boleto', 'cartao'));