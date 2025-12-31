-- Adicionar campo plano e limite_oabs_personalizado na tabela tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS plano TEXT NOT NULL DEFAULT 'solo',
ADD COLUMN IF NOT EXISTS limite_oabs_personalizado INTEGER;

-- Criar tabela de configuração de planos
CREATE TABLE IF NOT EXISTS public.planos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  valor_mensal NUMERIC NOT NULL DEFAULT 0,
  limite_oabs INTEGER,
  limite_usuarios INTEGER,
  limite_processos_cadastrados INTEGER,
  limite_processos_monitorados INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS na tabela planos_config
ALTER TABLE public.planos_config ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (todos podem ver os planos)
CREATE POLICY "Planos são visíveis para todos autenticados"
ON public.planos_config
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política para super admins gerenciarem planos
CREATE POLICY "Super admins podem gerenciar planos"
ON public.planos_config
FOR ALL
USING (is_super_admin(auth.uid()));

-- Inserir os planos padrão
INSERT INTO public.planos_config (codigo, nome, valor_mensal, limite_oabs, limite_usuarios, limite_processos_cadastrados, limite_processos_monitorados) VALUES
('solo', 'Solo', 99, 1, 1, 30, 30),
('essencial', 'Essencial', 200, 3, 3, 100, 100),
('estrutura', 'Estrutura', 400, 10, 10, NULL, 200),
('expansao', 'Expansão', 600, NULL, NULL, NULL, 400),
('enterprise', 'Enterprise', 1000, NULL, NULL, NULL, 800)
ON CONFLICT (codigo) DO NOTHING;