

## Plano: Corrigir erro `dental_profiles` does not exist

### Diagnóstico

- **Nenhuma migration cria** a tabela `dental_profiles` (provavelmente foi criada manualmente no Studio)
- A migration `20251023020416` tenta criar RLS policies em `dental_profiles` → **falha no db reset** porque a tabela não existe
- A migration `20251127161655` remove o sistema dental inteiro (DROP FUNCTION, DROP TYPE CASCADE)
- Conclusão: o bloco dental_profiles na migration `20251023` é **código morto** que nunca deveria executar

### Correção

Editar **um único arquivo**: `supabase/migrations/20251023020416_78c569d3-6656-414a-8f6f-0be00d1b9496.sql`

**Envolver o bloco DO $$ das dental_profiles (linhas 33-79) em um check de existência da tabela:**

```sql
-- Fix 4: Add missing RLS policies for dental_profiles (with IF NOT EXISTS)
-- NOTA: dental_profiles pode não existir em ambientes locais (tabela foi removida)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dental_profiles') THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'dental_profiles' 
      AND policyname = 'Users can view their own dental profile'
    ) THEN
      CREATE POLICY "Users can view their own dental profile"
        ON public.dental_profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    -- (demais IF NOT EXISTS permanecem iguais, dentro do IF EXISTS)

    IF NOT EXISTS (...) THEN ... END IF;
    IF NOT EXISTS (...) THEN ... END IF;
    IF NOT EXISTS (...) THEN ... END IF;

  END IF;  -- fim do IF EXISTS dental_profiles
END $$;
```

As linhas 1-31 (policies de profiles, leads_captacao, metal_ops) **ficam intactas**.

### Impacto

- **Produção**: zero impacto — a tabela dental_profiles já foi dropada pelo CASCADE na migration `20251127`, então o IF EXISTS simplesmente pula o bloco
- **Local**: o db reset passa sem erro
- **GitHub**: atualizado automaticamente pelo sync do Lovable após implementação

### SQL completo corrigido do arquivo (para colar localmente se preferir)

```sql
-- Fix 1: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Remove public access from leads_captacao table
DROP POLICY IF EXISTS "Users can view their leads and public landing page leads" ON public.leads_captacao;

CREATE POLICY "Users can view their own leads"
  ON public.leads_captacao FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leads"
  ON public.leads_captacao FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Require authentication for metal_ops table
DROP POLICY IF EXISTS "Operators can view all OPs" ON public.metal_ops;

CREATE POLICY "Authenticated metal users can view OPs"
  ON public.metal_ops FOR SELECT
  TO authenticated
  USING (
    has_metal_role(auth.uid(), 'admin'::metal_role) OR 
    has_metal_role(auth.uid(), 'operador'::metal_role)
  );

-- Fix 4: Add missing RLS policies for dental_profiles
-- NOTA: dental_profiles pode nao existir (sistema dental removido em 20251127)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dental_profiles') THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'dental_profiles' 
      AND policyname = 'Users can view their own dental profile'
    ) THEN
      CREATE POLICY "Users can view their own dental profile"
        ON public.dental_profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'dental_profiles' 
      AND policyname = 'Users can update their own dental profile'
    ) THEN
      CREATE POLICY "Users can update their own dental profile"
        ON public.dental_profiles FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'dental_profiles' 
      AND policyname = 'Users can insert their own dental profile'
    ) THEN
      CREATE POLICY "Users can insert their own dental profile"
        ON public.dental_profiles FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'dental_profiles' 
      AND policyname = 'Dental admins can view all profiles'
    ) THEN
      CREATE POLICY "Dental admins can view all profiles"
        ON public.dental_profiles FOR SELECT
        TO authenticated
        USING (has_dental_role(auth.uid(), 'admin'::dental_role));
    END IF;

  END IF;
END $$;
```

