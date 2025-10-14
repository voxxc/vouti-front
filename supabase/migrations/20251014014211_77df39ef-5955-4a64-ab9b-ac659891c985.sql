-- FASE 1: Modificar trigger para não criar profiles para usuários MetalSystem
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ❌ NÃO criar profile se o email contém @metalsystem.local
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- ✅ Criar profile apenas para usuários do Mora
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role_type, 'advogado'::user_role_type)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- FASE 2: Limpar usuários MetalSystem existentes das tabelas do Mora
-- Deletar de user_roles (tabela de roles do Mora)
DELETE FROM user_roles
WHERE user_id IN (
  SELECT user_id FROM metal_profiles
);

-- Deletar de profiles (tabela de usuários do Mora)
DELETE FROM profiles
WHERE user_id IN (
  SELECT user_id FROM metal_profiles
);

-- FASE 4: Adicionar RLS policy para prevenir leitura de usuários MetalSystem
CREATE POLICY "Prevent MetalSystem users in Mora queries"
ON profiles
FOR SELECT
USING (
  email NOT LIKE '%@metalsystem.local'
);