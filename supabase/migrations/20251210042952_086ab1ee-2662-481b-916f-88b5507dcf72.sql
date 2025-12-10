-- 1. Atualizar parcelas existentes com tenant_id do cliente
UPDATE cliente_parcelas cp
SET tenant_id = c.tenant_id
FROM clientes c
WHERE cp.cliente_id = c.id
AND cp.tenant_id IS NULL;

-- 2. Recriar função gerar_parcelas_cliente com tenant_id incluído
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
  intervalo_dias INTEGER;
  dias_por_parcela NUMERIC;
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
    
  -- MODELO ANTIGO: Fallback para retrocompatibilidade
  ELSIF NEW.forma_pagamento = 'parcelado' 
     AND NEW.numero_parcelas > 0 THEN
    
    -- Se tiver ambas as datas definidas, usar distribuição entre elas
    IF NEW.data_vencimento_inicial IS NOT NULL AND NEW.data_vencimento_final IS NOT NULL THEN
      -- Calcular intervalo em dias
      intervalo_dias := NEW.data_vencimento_final - NEW.data_vencimento_inicial;
      
      -- Calcular dias por parcela
      IF NEW.numero_parcelas > 1 THEN
        dias_por_parcela := intervalo_dias::NUMERIC / (NEW.numero_parcelas - 1);
      ELSE
        dias_por_parcela := 0;
      END IF;
      
      -- Gerar parcelas distribuídas uniformemente entre as datas
      FOR i IN 1..NEW.numero_parcelas LOOP
        -- Calcular data proporcional
        data_vencimento := NEW.data_vencimento_inicial + ((i - 1) * dias_por_parcela)::INTEGER;
        
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
          data_vencimento,
          CASE
            WHEN data_vencimento < CURRENT_DATE THEN 'atrasado'
            ELSE 'pendente'
          END,
          NEW.tenant_id
        );
      END LOOP;
    ELSE
      -- Fallback: usar data_fechamento com intervalos mensais
      FOR i IN 1..NEW.numero_parcelas LOOP
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
          (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE,
          CASE
            WHEN (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE < CURRENT_DATE THEN 'atrasado'
            ELSE 'pendente'
          END,
          NEW.tenant_id
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;