-- Adicionar coluna system_name para armazenar o tribunal/sistema escolhido
ALTER TABLE public.credenciais_cliente 
ADD COLUMN IF NOT EXISTS system_name TEXT DEFAULT NULL;

-- Comentário descritivo
COMMENT ON COLUMN public.credenciais_cliente.system_name IS 'Tribunal/sistema para o qual a credencial será cadastrada no cofre Judit (ex: PJE TJBA - 1º grau)';