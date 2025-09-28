-- Atualizar o usuário danieldemorais.e@gmail.com para admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'danieldemorais.e@gmail.com';

-- Criar enum para roles mais específicos
CREATE TYPE public.user_role_type AS ENUM ('admin', 'advogado', 'comercial', 'financeiro');