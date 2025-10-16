-- Adicionar campos de classificação e pessoas adicionais à tabela clientes
ALTER TABLE public.clientes
ADD COLUMN classificacao TEXT CHECK (classificacao IN ('pf', 'pj')),
ADD COLUMN pessoas_adicionais JSONB DEFAULT '[]'::jsonb;

-- Criar índice para melhor performance em queries de relatórios
CREATE INDEX idx_clientes_classificacao ON public.clientes(classificacao);

-- Comentários para documentação
COMMENT ON COLUMN public.clientes.classificacao IS 'Classificação principal do cliente: pf (Pessoa Física) ou pj (Pessoa Jurídica)';
COMMENT ON COLUMN public.clientes.pessoas_adicionais IS 'Array JSON com dados de pessoas/empresas adicionais envolvidas no contrato';