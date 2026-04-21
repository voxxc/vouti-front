-- Limpa órfãos antes de criar a FK
UPDATE public.documentos 
SET responsavel_id = NULL 
WHERE responsavel_id IS NOT NULL 
  AND responsavel_id NOT IN (SELECT user_id FROM public.profiles);

-- Adiciona a foreign key faltante entre documentos.responsavel_id e profiles.user_id
ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_responsavel_id_fkey
  FOREIGN KEY (responsavel_id)
  REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;