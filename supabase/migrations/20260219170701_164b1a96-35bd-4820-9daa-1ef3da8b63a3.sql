ALTER TABLE public.reunioes
  ADD CONSTRAINT reunioes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON DELETE SET NULL;