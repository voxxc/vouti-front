
-- ============================================================
-- Função: detecta e cria audiência a partir de um andamento
-- ============================================================
CREATE OR REPLACE FUNCTION public.processar_audiencia_from_andamento(
  p_andamento_id uuid,
  p_processo_oab_id uuid,
  p_tenant_id uuid,
  p_descricao text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desc_upper text;
  v_match text[];
  v_data timestamptz := NULL;
  v_hora_conhecida boolean := false;
  v_local text := NULL;
  v_modalidade text := NULL;
  v_tipo text := 'Outras';
  v_dia int; v_mes int; v_ano int; v_hh int; v_mm int;
  v_mes_str text;
BEGIN
  IF p_descricao IS NULL OR p_tenant_id IS NULL OR p_processo_oab_id IS NULL THEN
    RETURN;
  END IF;

  v_desc_upper := UPPER(p_descricao);

  -- Precisa mencionar audiência/sessão/pauta
  IF v_desc_upper !~ '(AUDI[EÊ]NCIA|SESS[ÃA]O|PAUTA)' THEN
    RETURN;
  END IF;

  -- Precisa ter palavra de agendamento
  IF v_desc_upper !~ '(DESIGNADA|REDESIGNADA|AGENDADA|MARCADA)' THEN
    RETURN;
  END IF;

  -- Descartar confirmação de intimação
  IF v_desc_upper ~ 'CONFIRMAD[OA]\s+(A\s+)?INTIMA[CÇ][AÃ]O' THEN
    RETURN;
  END IF;
  IF v_desc_upper ~ 'REFERENTE AO EVENTO' THEN
    RETURN;
  END IF;

  -- ===== Tipo =====
  v_tipo := CASE
    WHEN v_desc_upper ~ 'ART\.?\s*334' THEN 'Art. 334'
    WHEN v_desc_upper ~ 'CONCILIA'     THEN 'Conciliação'
    WHEN v_desc_upper ~ 'INSTRU'       THEN 'Instrução'
    WHEN v_desc_upper ~ 'JULGAMENTO'   THEN 'Julgamento'
    WHEN v_desc_upper ~ 'MEDIA'        THEN 'Mediação'
    ELSE 'Outras'
  END;

  -- ===== Parse "Longo": AGENDADA PARA: 24 DE SETEMBRO DE 2026 ÀS 13:34, EM <local>, MODALIDADE: <mod> =====
  v_match := regexp_match(
    p_descricao,
    'AGENDADA\s+PARA:?\s*(\d{1,2})\s+DE\s+([A-Za-zÇÃÉÍÓÚÂÊÔçãéíóúâêô]+)\s+DE\s+(\d{4})(?:\s+[ÀAàa][Ss]\s+(\d{1,2}):(\d{2}))?(?:[,\s]+EM\s+([^,)]+?))?(?:[,\s]+MODALIDADE:\s*([A-Za-zÇÃÉÍÓÚÂÊÔçãéíóúâêô]+))?\s*\)?',
    'i'
  );

  IF v_match IS NOT NULL THEN
    v_dia := v_match[1]::int;
    v_mes_str := UPPER(
      translate(v_match[2], 'ÇÃÉÍÓÚÂÊÔÀçãéíóúâêôà', 'CAEIOUAEOACAEIOUAEOA')
    );
    v_mes := CASE v_mes_str
      WHEN 'JANEIRO' THEN 1
      WHEN 'FEVEREIRO' THEN 2
      WHEN 'MARCO' THEN 3
      WHEN 'ABRIL' THEN 4
      WHEN 'MAIO' THEN 5
      WHEN 'JUNHO' THEN 6
      WHEN 'JULHO' THEN 7
      WHEN 'AGOSTO' THEN 8
      WHEN 'SETEMBRO' THEN 9
      WHEN 'OUTUBRO' THEN 10
      WHEN 'NOVEMBRO' THEN 11
      WHEN 'DEZEMBRO' THEN 12
      ELSE NULL
    END;
    v_ano := v_match[3]::int;

    IF v_mes IS NOT NULL THEN
      IF v_match[4] IS NOT NULL THEN
        v_hh := v_match[4]::int;
        v_mm := COALESCE(v_match[5]::int, 0);
        v_hora_conhecida := true;
      ELSE
        v_hh := 12; v_mm := 0;
        v_hora_conhecida := false;
      END IF;

      BEGIN
        v_data := make_timestamptz(v_ano, v_mes, v_dia, v_hh, v_mm, 0, 'America/Sao_Paulo');
      EXCEPTION WHEN OTHERS THEN
        v_data := NULL;
      END;

      v_local := NULLIF(TRIM(v_match[6]), '');
      v_modalidade := NULLIF(TRIM(v_match[7]), '');
    END IF;
  END IF;

  -- ===== Fallback "Curto": DD/MM/YYYY [HH:MM] =====
  IF v_data IS NULL THEN
    v_match := regexp_match(
      p_descricao,
      '(\d{2})/(\d{2})/(\d{4})(?:[\s,]+(\d{1,2}):(\d{2}))?'
    );
    IF v_match IS NOT NULL THEN
      v_dia := v_match[1]::int;
      v_mes := v_match[2]::int;
      v_ano := v_match[3]::int;
      IF v_match[4] IS NOT NULL THEN
        v_hh := v_match[4]::int;
        v_mm := COALESCE(v_match[5]::int, 0);
        v_hora_conhecida := true;
      ELSE
        v_hh := 12; v_mm := 0;
        v_hora_conhecida := false;
      END IF;
      BEGIN
        v_data := make_timestamptz(v_ano, v_mes, v_dia, v_hh, v_mm, 0, 'America/Sao_Paulo');
      EXCEPTION WHEN OTHERS THEN
        v_data := NULL;
      END;
    END IF;
  END IF;

  IF v_data IS NULL THEN
    RETURN;
  END IF;

  -- Insert (ignora se já existe audiência para o mesmo processo/data)
  INSERT INTO public.audiencias (
    tenant_id,
    processo_oab_id,
    andamento_origem_id,
    data_audiencia,
    hora_conhecida,
    tipo,
    modalidade,
    local,
    status,
    descricao_origem
  ) VALUES (
    p_tenant_id,
    p_processo_oab_id,
    p_andamento_id,
    v_data,
    v_hora_conhecida,
    v_tipo,
    v_modalidade,
    v_local,
    'pendente',
    p_descricao
  )
  ON CONFLICT (processo_oab_id, data_audiencia) DO NOTHING;

EXCEPTION WHEN OTHERS THEN
  -- Nunca falhar o insert do andamento por erro de parse
  RETURN;
END;
$$;

-- ============================================================
-- Trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_audiencia_from_andamento_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.processar_audiencia_from_andamento(
    NEW.id,
    NEW.processo_oab_id,
    NEW.tenant_id,
    NEW.descricao
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audiencia_from_andamento ON public.processos_oab_andamentos;
CREATE TRIGGER trg_audiencia_from_andamento
AFTER INSERT ON public.processos_oab_andamentos
FOR EACH ROW
EXECUTE FUNCTION public.trg_audiencia_from_andamento_fn();

-- ============================================================
-- BACKFILL: andamentos antigos que ainda não viraram audiência
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT a.id, a.processo_oab_id, a.tenant_id, a.descricao
    FROM public.processos_oab_andamentos a
    WHERE a.descricao IS NOT NULL
      AND a.descricao ~* '(audi[eê]ncia|sess[aã]o|pauta)'
      AND a.descricao ~* '(designada|redesignada|agendada|marcada)'
  LOOP
    PERFORM public.processar_audiencia_from_andamento(
      r.id, r.processo_oab_id, r.tenant_id, r.descricao
    );
  END LOOP;
END $$;
