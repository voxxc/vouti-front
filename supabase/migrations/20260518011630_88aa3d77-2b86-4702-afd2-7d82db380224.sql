
-- 1. Função imutável que normaliza descrição e gera hash de dedup
CREATE OR REPLACE FUNCTION public.compute_andamento_dedup_hash(descricao text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(coalesce(
    (SELECT string_agg(b, '.' ORDER BY b)
       FROM unnest(string_to_array(
         lower(trim(regexp_replace(coalesce(descricao, ''), '\s+', ' ', 'g'))),
         '.'
       )) b),
    ''))
$$;

-- 2. Coluna gerada dedup_hash (auto-preenche em todas as linhas existentes e futuras)
ALTER TABLE public.processos_oab_andamentos
  ADD COLUMN IF NOT EXISTS dedup_hash text
  GENERATED ALWAYS AS (public.compute_andamento_dedup_hash(descricao)) STORED;

-- 3. Silencia cópias duplicadas (não apaga nada): mantém a mais antiga,
--    marca cópias posteriores como lida=true
WITH dups AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY processo_oab_id, data_movimentacao, dedup_hash
           ORDER BY created_at, id
         ) AS rn
  FROM public.processos_oab_andamentos
)
UPDATE public.processos_oab_andamentos a
   SET lida = true
  FROM dups
 WHERE dups.id = a.id
   AND dups.rn > 1
   AND a.lida = false;

-- 4. Índice de apoio para o trigger (rápido lookup do "já existe")
CREATE INDEX IF NOT EXISTS processos_oab_andamentos_dedup_idx
  ON public.processos_oab_andamentos (processo_oab_id, data_movimentacao, dedup_hash);

-- 5. Trigger que bloqueia silenciosamente novas cópias duplicadas
CREATE OR REPLACE FUNCTION public.prevent_andamento_oab_duplicate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.processos_oab_andamentos
     WHERE processo_oab_id = NEW.processo_oab_id
       AND data_movimentacao IS NOT DISTINCT FROM NEW.data_movimentacao
       AND dedup_hash = public.compute_andamento_dedup_hash(NEW.descricao)
  ) THEN
    -- Já existe um andamento equivalente: descarta silenciosamente
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_andamento_oab_duplicate
  ON public.processos_oab_andamentos;

CREATE TRIGGER trg_prevent_andamento_oab_duplicate
BEFORE INSERT ON public.processos_oab_andamentos
FOR EACH ROW
EXECUTE FUNCTION public.prevent_andamento_oab_duplicate();
