-- Criar tabela de parcelas de clientes
CREATE TABLE IF NOT EXISTS public.cliente_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor_parcela NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
  metodo_pagamento TEXT,
  comprovante_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cliente_id, numero_parcela)
);

-- Criar tabela de comentários de pagamento
CREATE TABLE IF NOT EXISTS public.cliente_pagamento_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcela_id UUID NOT NULL REFERENCES public.cliente_parcelas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.cliente_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_pagamento_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies para cliente_parcelas
CREATE POLICY "Users can view parcelas of their clients"
ON public.cliente_parcelas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_parcelas.cliente_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all parcelas"
ON public.cliente_parcelas
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create parcelas for their clients"
ON public.cliente_parcelas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_parcelas.cliente_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update parcelas of their clients"
ON public.cliente_parcelas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = cliente_parcelas.cliente_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all parcelas"
ON public.cliente_parcelas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para cliente_pagamento_comentarios
CREATE POLICY "Users can view comentarios of their clients parcelas"
ON public.cliente_pagamento_comentarios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cliente_parcelas cp
    JOIN public.clientes c ON c.id = cp.cliente_id
    WHERE cp.id = cliente_pagamento_comentarios.parcela_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comentarios on their clients parcelas"
ON public.cliente_pagamento_comentarios
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.cliente_parcelas cp
    JOIN public.clientes c ON c.id = cp.cliente_id
    WHERE cp.id = cliente_pagamento_comentarios.parcela_id
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comentarios"
ON public.cliente_pagamento_comentarios
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comentarios"
ON public.cliente_pagamento_comentarios
FOR DELETE
USING (auth.uid() = user_id);

-- Função para gerar parcelas automaticamente
CREATE OR REPLACE FUNCTION public.gerar_parcelas_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for parcelado e ainda não tem parcelas
  IF NEW.forma_pagamento = 'parcelado' AND NEW.numero_parcelas > 0 THEN
    -- Limpar parcelas antigas se for uma atualização
    DELETE FROM public.cliente_parcelas WHERE cliente_id = NEW.id;
    
    -- Gerar novas parcelas
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
  
  RETURN NEW;
END;
$$;

-- Trigger para gerar parcelas ao criar/atualizar cliente
DROP TRIGGER IF EXISTS trigger_gerar_parcelas ON public.clientes;
CREATE TRIGGER trigger_gerar_parcelas
  AFTER INSERT OR UPDATE OF forma_pagamento, numero_parcelas, valor_parcela, data_fechamento
  ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_parcelas_cliente();

-- Função para atualizar status de parcelas vencidas
CREATE OR REPLACE FUNCTION public.atualizar_status_parcelas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cliente_parcelas
  SET status = 'atrasado'
  WHERE status = 'pendente'
  AND data_vencimento < CURRENT_DATE;
END;
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_cliente_parcelas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger para updated_at em cliente_parcelas
DROP TRIGGER IF EXISTS update_cliente_parcelas_updated_at ON public.cliente_parcelas;
CREATE TRIGGER update_cliente_parcelas_updated_at
  BEFORE UPDATE ON public.cliente_parcelas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cliente_parcelas_updated_at();

-- Trigger para updated_at em cliente_pagamento_comentarios
DROP TRIGGER IF EXISTS update_comentarios_updated_at ON public.cliente_pagamento_comentarios;
CREATE TRIGGER update_comentarios_updated_at
  BEFORE UPDATE ON public.cliente_pagamento_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket de storage para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-pagamento', 'comprovantes-pagamento', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para storage de comprovantes
CREATE POLICY "Users can upload comprovantes for their clients"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes-pagamento'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view comprovantes of their clients"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'comprovantes-pagamento'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete comprovantes of their clients"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'comprovantes-pagamento'
  AND auth.uid() IS NOT NULL
);