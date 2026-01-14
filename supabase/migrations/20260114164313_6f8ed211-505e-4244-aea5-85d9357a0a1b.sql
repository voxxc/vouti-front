-- Remover FK atual que aponta para auth.users (se existir)
ALTER TABLE public.deadlines
DROP CONSTRAINT IF EXISTS deadlines_concluido_por_fkey;

-- Adicionar FK que aponta para profiles.user_id com nome explícito
-- Isso permite o PostgREST resolver o join corretamente
ALTER TABLE public.deadlines
ADD CONSTRAINT deadlines_concluido_por_fkey 
  FOREIGN KEY (concluido_por) 
  REFERENCES public.profiles(user_id) 
  ON DELETE SET NULL;