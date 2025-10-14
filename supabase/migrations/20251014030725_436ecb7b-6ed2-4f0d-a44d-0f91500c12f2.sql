-- =====================================================
-- SISTEMA DENTAL - Estrutura Completa (CORRIGIDA)
-- =====================================================

-- 1. Criar Enum para Roles do Sistema Dental
CREATE TYPE public.dental_role AS ENUM ('admin', 'dentista', 'recepcionista', 'paciente');

-- 2. Criar Tabela de Perfis Dental
CREATE TABLE public.dental_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  especialidade TEXT,
  crm TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dental_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dental profile"
  ON public.dental_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own dental profile"
  ON public.dental_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dental profile"
  ON public.dental_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Criar Tabela de Roles Dental
CREATE TABLE public.dental_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role dental_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.dental_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all dental roles"
  ON public.dental_user_roles FOR SELECT
  USING (true);

-- 4. Criar Função Helper para Verificar Roles (ANTES das policies que a usam)
CREATE OR REPLACE FUNCTION public.has_dental_role(_user_id UUID, _role dental_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dental_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Criar Policy que usa a função (DEPOIS da função existir)
CREATE POLICY "Admins can manage all dental roles"
  ON public.dental_user_roles FOR ALL
  USING (has_dental_role(auth.uid(), 'admin'::dental_role));

-- 6. Criar Trigger para Auto-atribuir Role Admin
CREATE OR REPLACE FUNCTION public.assign_dental_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for admin@dental.local, adicionar role admin
  IF NEW.email = 'admin@dental.local' THEN
    INSERT INTO public.dental_user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::dental_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Para outros emails @dental.local, adicionar role dentista
    INSERT INTO public.dental_user_roles (user_id, role)
    VALUES (NEW.user_id, 'dentista'::dental_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_admin_role_trigger
AFTER INSERT ON public.dental_profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_dental_admin_role();

-- 7. Atualizar Função handle_new_user() para suportar @dental.local
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- MetalSystem users: criar apenas metal_profiles
  IF NEW.email LIKE '%@metalsystem.local' THEN
    RETURN NEW;
  END IF;

  -- Dental users: criar apenas dental_profiles
  IF NEW.email LIKE '%@dental.local' THEN
    INSERT INTO public.dental_profiles (user_id, email, full_name, avatar_url, especialidade)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'especialidade'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
  END IF;

  -- Mora users: criar profiles (lógica existente)
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

-- 8. Criar Tabela de Pacientes
CREATE TABLE public.dental_pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  cpf TEXT,
  data_nascimento DATE,
  telefone TEXT,
  endereco TEXT,
  convenio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dental_pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dentistas can view all pacientes"
  ON public.dental_pacientes FOR SELECT
  USING (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

CREATE POLICY "Dentistas can create pacientes"
  ON public.dental_pacientes FOR INSERT
  WITH CHECK (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

CREATE POLICY "Dentistas can update pacientes"
  ON public.dental_pacientes FOR UPDATE
  USING (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

-- 9. Criar Tabela de Consultas
CREATE TABLE public.dental_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES dental_pacientes(id),
  dentista_id UUID REFERENCES dental_profiles(user_id),
  data_hora TIMESTAMPTZ NOT NULL,
  tipo TEXT,
  status TEXT DEFAULT 'agendada',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dental_consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dentistas can view all consultas"
  ON public.dental_consultas FOR SELECT
  USING (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

CREATE POLICY "Dentistas can create consultas"
  ON public.dental_consultas FOR INSERT
  WITH CHECK (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

CREATE POLICY "Dentistas can update consultas"
  ON public.dental_consultas FOR UPDATE
  USING (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

-- 10. Criar Tabela de Prontuários
CREATE TABLE public.dental_prontuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES dental_pacientes(id),
  dentista_id UUID REFERENCES dental_profiles(user_id),
  data_consulta TIMESTAMPTZ NOT NULL,
  anamnese TEXT,
  diagnostico TEXT,
  tratamento_realizado TEXT,
  proximas_etapas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dental_prontuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dentistas can view all prontuarios"
  ON public.dental_prontuarios FOR SELECT
  USING (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

CREATE POLICY "Dentistas can create prontuarios"
  ON public.dental_prontuarios FOR INSERT
  WITH CHECK (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

CREATE POLICY "Dentistas can update prontuarios"
  ON public.dental_prontuarios FOR UPDATE
  USING (has_dental_role(auth.uid(), 'dentista'::dental_role) OR has_dental_role(auth.uid(), 'admin'::dental_role));

-- 11. Trigger para updated_at
CREATE TRIGGER update_dental_profiles_updated_at
  BEFORE UPDATE ON public.dental_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dental_pacientes_updated_at
  BEFORE UPDATE ON public.dental_pacientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();