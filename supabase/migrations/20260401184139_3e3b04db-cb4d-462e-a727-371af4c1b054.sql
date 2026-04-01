-- Add deadline_number column
ALTER TABLE public.deadlines ADD COLUMN deadline_number integer;

-- Function to auto-assign sequential number per tenant
CREATE OR REPLACE FUNCTION public.set_deadline_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(deadline_number), 0) + 1 INTO next_num
  FROM public.deadlines
  WHERE tenant_id = NEW.tenant_id;
  
  NEW.deadline_number := next_num;
  RETURN NEW;
END;
$$;

-- Trigger BEFORE INSERT
CREATE TRIGGER trg_set_deadline_number
  BEFORE INSERT ON public.deadlines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deadline_number();

-- Backfill existing deadlines
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.deadlines
)
UPDATE public.deadlines d SET deadline_number = n.rn
FROM numbered n WHERE d.id = n.id;

-- Unique constraint per tenant
CREATE UNIQUE INDEX idx_deadlines_tenant_number ON public.deadlines (tenant_id, deadline_number);