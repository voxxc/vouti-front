-- Primeiro atualizar todos os valores 'user' para 'advogado' 
UPDATE public.profiles SET role = 'advogado' WHERE role = 'user';

-- Depois remover o valor padrão
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Alterar o tipo da coluna
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role_type 
USING role::public.user_role_type;

-- Definir o novo valor padrão
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'advogado';