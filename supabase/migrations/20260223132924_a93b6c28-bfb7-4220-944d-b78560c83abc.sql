
-- =============================================
-- Fix metal_setor_flow RLS: restrict all policies TO authenticated
-- =============================================

-- 1. Drop all existing policies
DROP POLICY IF EXISTS "Operators can view all flows" ON public.metal_setor_flow;
DROP POLICY IF EXISTS "Admins can manage all sector flows" ON public.metal_setor_flow;
DROP POLICY IF EXISTS "Operators can delete their sector flows" ON public.metal_setor_flow;
DROP POLICY IF EXISTS "Operators can insert sector flows" ON public.metal_setor_flow;
DROP POLICY IF EXISTS "Operators can update flows" ON public.metal_setor_flow;

-- 2. Recreate with TO authenticated and proper role checks

CREATE POLICY "Authenticated metal users can view flows"
ON public.metal_setor_flow FOR SELECT TO authenticated
USING (
  has_metal_role(auth.uid(), 'operador'::metal_role)
  OR has_metal_role(auth.uid(), 'admin'::metal_role)
);

CREATE POLICY "Admins can manage all sector flows"
ON public.metal_setor_flow FOR ALL TO authenticated
USING (has_metal_role(auth.uid(), 'admin'::metal_role));

CREATE POLICY "Operators can delete their sector flows"
ON public.metal_setor_flow FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM metal_profiles mp
  WHERE mp.user_id = auth.uid() AND mp.setor = metal_setor_flow.setor
));

CREATE POLICY "Operators can insert sector flows"
ON public.metal_setor_flow FOR INSERT TO authenticated
WITH CHECK (
  has_metal_role(auth.uid(), 'operador'::metal_role)
  OR has_metal_role(auth.uid(), 'admin'::metal_role)
);

CREATE POLICY "Operators can update flows"
ON public.metal_setor_flow FOR UPDATE TO authenticated
USING (
  has_metal_role(auth.uid(), 'operador'::metal_role)
  OR has_metal_role(auth.uid(), 'admin'::metal_role)
);
