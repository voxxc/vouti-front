-- Criar funcao IMMUTABLE para truncar timestamp
CREATE OR REPLACE FUNCTION public.truncate_minute(ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('minute', ts AT TIME ZONE 'UTC')
$$;

-- Criar funcao IMMUTABLE para normalizar descricao
CREATE OR REPLACE FUNCTION public.normalize_descricao(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEFT(LOWER(TRIM(COALESCE(txt, ''))), 100)
$$;

-- Limpar duplicatas de processos_oab_andamentos mantendo o registro mais antigo
DELETE FROM processos_oab_andamentos
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY processo_oab_id, 
                     public.truncate_minute(data_movimentacao), 
                     public.normalize_descricao(descricao)
        ORDER BY created_at ASC
      ) as rn
    FROM processos_oab_andamentos
  ) ranked
  WHERE rn > 1
);

-- Criar indice unico para impedir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_andamentos_unique_v3 
ON processos_oab_andamentos (
  processo_oab_id, 
  public.truncate_minute(data_movimentacao), 
  public.normalize_descricao(descricao)
);