-- 1. Adicionar coluna valor_pago na tabela cliente_parcelas
ALTER TABLE public.cliente_parcelas ADD COLUMN IF NOT EXISTS valor_pago NUMERIC;

-- 2. Adicionar coluna proveito_economico na tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS proveito_economico NUMERIC;

-- 3. Atualizar a função gerar_parcelas_cliente para usar intervalos mensais fixos
CREATE OR REPLACE FUNCTION public.gerar_parcelas_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  grupo_item JSONB;
  parcela_num INTEGER := 0;
  data_vencimento DATE;
  entrada_obj JSONB;
  data_calc DATE;
BEGIN
  -- Limpar parcelas antigas se for uma atualização
  DELETE FROM public.cliente_parcelas WHERE cliente_id = NEW.id;
  
  -- NOVO MODELO: Se tiver grupos_parcelas definidos
  IF NEW.grupos_parcelas IS NOT NULL THEN
    
    -- Processar entrada (se existir)
    entrada_obj := NEW.grupos_parcelas->'entrada';
    IF entrada_obj IS NOT NULL AND entrada_obj->>'valor' IS NOT NULL THEN
      INSERT INTO public.cliente_parcelas (
        cliente_id, 
        numero_parcela, 
        valor_parcela, 
        data_vencimento, 
        status,
        grupo_descricao,
        tenant_id
      ) VALUES (
        NEW.id, 
        0, 
        (entrada_obj->>'valor')::NUMERIC,
        (entrada_obj->>'data_vencimento')::DATE,
        CASE WHEN (entrada_obj->>'data_vencimento')::DATE < CURRENT_DATE 
          THEN 'atrasado' ELSE 'pendente' END,
        'Entrada',
        NEW.tenant_id
      );
    END IF;
    
    -- Processar cada grupo de parcelas
    FOR grupo_item IN SELECT * FROM jsonb_array_elements(NEW.grupos_parcelas->'grupos') ORDER BY (value->>'ordem')::INTEGER
    LOOP
      FOR i IN 1..(grupo_item->>'quantidade')::INTEGER LOOP
        parcela_num := parcela_num + 1;
        
        -- Calcular data de vencimento (mensal a partir da data_inicio)
        data_vencimento := (grupo_item->>'data_inicio')::DATE + ((i - 1) || ' months')::INTERVAL;
        
        INSERT INTO public.cliente_parcelas (
          cliente_id, 
          numero_parcela, 
          valor_parcela,
          data_vencimento, 
          status,
          grupo_descricao,
          tenant_id
        ) VALUES (
          NEW.id, 
          parcela_num,
          (grupo_item->>'valor_parcela')::NUMERIC,
          data_vencimento,
          CASE WHEN data_vencimento < CURRENT_DATE 
            THEN 'atrasado' ELSE 'pendente' END,
          grupo_item->>'descricao',
          NEW.tenant_id
        );
      END LOOP;
    END LOOP;
    
  -- MODELO SIMPLES (CORRIGIDO): Usar intervalos mensais mantendo o dia fixo
  ELSIF NEW.forma_pagamento = 'parcelado' 
     AND NEW.numero_parcelas > 0 THEN
    
    IF NEW.data_vencimento_inicial IS NOT NULL THEN
      -- Gerar parcelas com intervalos mensais a partir da data inicial
      FOR i IN 1..NEW.numero_parcelas LOOP
        -- Adicionar meses à data inicial mantendo o mesmo dia
        data_calc := NEW.data_vencimento_inicial + ((i - 1) || ' months')::INTERVAL;
        
        INSERT INTO public.cliente_parcelas (
          cliente_id,
          numero_parcela,
          valor_parcela,
          data_vencimento,
          status,
          tenant_id
        ) VALUES (
          NEW.id,
          i,
          NEW.valor_parcela,
          data_calc,
          CASE WHEN data_calc < CURRENT_DATE THEN 'atrasado' ELSE 'pendente' END,
          NEW.tenant_id
        );
      END LOOP;
    ELSE
      -- Fallback: usar data_fechamento com intervalos mensais se não tiver data_vencimento_inicial
      FOR i IN 1..NEW.numero_parcelas LOOP
        data_calc := (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE;
        
        INSERT INTO public.cliente_parcelas (
          cliente_id,
          numero_parcela,
          valor_parcela,
          data_vencimento,
          status,
          tenant_id
        ) VALUES (
          NEW.id,
          i,
          NEW.valor_parcela,
          data_calc,
          CASE WHEN data_calc < CURRENT_DATE THEN 'atrasado' ELSE 'pendente' END,
          NEW.tenant_id
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;