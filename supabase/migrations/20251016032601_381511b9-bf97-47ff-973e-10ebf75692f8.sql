-- Remover coluna antiga dia_vencimento
ALTER TABLE clientes DROP COLUMN IF EXISTS dia_vencimento;

-- Adicionar novas colunas para período de vencimento
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS data_vencimento_inicial DATE,
ADD COLUMN IF NOT EXISTS data_vencimento_final DATE;

-- Adicionar constraint para garantir que final >= inicial
ALTER TABLE clientes 
DROP CONSTRAINT IF EXISTS check_datas_vencimento;

ALTER TABLE clientes 
ADD CONSTRAINT check_datas_vencimento 
CHECK (data_vencimento_final IS NULL OR data_vencimento_inicial IS NULL OR data_vencimento_final >= data_vencimento_inicial);

-- Atualizar função de geração de parcelas para usar as novas datas
CREATE OR REPLACE FUNCTION public.gerar_parcelas_cliente()
RETURNS TRIGGER AS $$
DECLARE
  intervalo_dias INTEGER;
  dias_por_parcela NUMERIC;
  data_parcela DATE;
BEGIN
  -- Se for parcelado e tiver número de parcelas
  IF NEW.forma_pagamento = 'parcelado' 
     AND NEW.numero_parcelas > 0 THEN
    
    -- Limpar parcelas antigas se for uma atualização
    DELETE FROM public.cliente_parcelas WHERE cliente_id = NEW.id;
    
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
        data_parcela := NEW.data_vencimento_inicial + ((i - 1) * dias_por_parcela)::INTEGER;
        
        INSERT INTO public.cliente_parcelas (
          cliente_id,
          numero_parcela,
          valor_parcela,
          data_vencimento,
          status
        ) VALUES (
          NEW.id,
          i,
          NEW.valor_parcela,
          data_parcela,
          CASE
            WHEN data_parcela < CURRENT_DATE THEN 'atrasado'
            ELSE 'pendente'
          END
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
          status
        ) VALUES (
          NEW.id,
          i,
          NEW.valor_parcela,
          (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE,
          CASE
            WHEN (NEW.data_fechamento + (i - 1) * INTERVAL '1 month')::DATE < CURRENT_DATE THEN 'atrasado'
            ELSE 'pendente'
          END
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Migrar dados existentes (converter clientes antigos)
-- Para clientes parcelados sem as novas datas, criar baseado no data_fechamento
UPDATE clientes 
SET 
  data_vencimento_inicial = data_fechamento + INTERVAL '1 month',
  data_vencimento_final = data_fechamento + (COALESCE(numero_parcelas, 1) * INTERVAL '1 month')
WHERE forma_pagamento = 'parcelado' 
  AND numero_parcelas > 0
  AND data_vencimento_inicial IS NULL
  AND data_vencimento_final IS NULL;