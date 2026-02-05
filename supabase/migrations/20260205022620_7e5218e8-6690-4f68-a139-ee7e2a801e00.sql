-- =====================================================
-- SISTEMA DE AUTOMAÇÃO DE PRAZOS PROCESSUAIS
-- =====================================================

-- 1. Tabela de Prazos Padrão CPC
CREATE TABLE public.prazos_processuais_cpc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ato TEXT NOT NULL UNIQUE,
  tipo_ato_label TEXT NOT NULL,
  prazo_dias INTEGER NOT NULL,
  dias_uteis BOOLEAN DEFAULT TRUE,
  fundamento_legal TEXT,
  categoria TEXT,
  padroes_deteccao TEXT[],
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir prazos padrão do CPC
INSERT INTO public.prazos_processuais_cpc (tipo_ato, tipo_ato_label, prazo_dias, dias_uteis, fundamento_legal, categoria, padroes_deteccao) VALUES
('contestacao', 'Contestação', 15, TRUE, 'Art. 335, CPC', 'resposta', ARRAY['contestar', 'contestação', 'apresentar defesa']),
('replica', 'Réplica', 15, TRUE, 'Art. 351, CPC', 'resposta', ARRAY['réplica', 'impugnação à contestação', 'manifestar sobre contestação']),
('embargos_declaracao', 'Embargos de Declaração', 5, TRUE, 'Art. 1.023, CPC', 'recurso', ARRAY['embargos de declaração', 'embargos declaratórios']),
('agravo_instrumento', 'Agravo de Instrumento', 15, TRUE, 'Art. 1.016, CPC', 'recurso', ARRAY['agravo de instrumento']),
('agravo_interno', 'Agravo Interno', 15, TRUE, 'Art. 1.021, CPC', 'recurso', ARRAY['agravo interno', 'agravo regimental']),
('apelacao', 'Apelação', 15, TRUE, 'Art. 1.003, CPC', 'recurso', ARRAY['apelação', 'apelar', 'recurso de apelação']),
('recurso_especial', 'Recurso Especial', 15, TRUE, 'Art. 1.029, CPC', 'recurso', ARRAY['recurso especial', 'resp']),
('recurso_extraordinario', 'Recurso Extraordinário', 15, TRUE, 'Art. 1.029, CPC', 'recurso', ARRAY['recurso extraordinário', 'rex']),
('impugnacao_cumprimento', 'Impugnação ao Cumprimento', 15, TRUE, 'Art. 525, CPC', 'resposta', ARRAY['impugnação ao cumprimento', 'impugnar cumprimento']),
('embargos_execucao', 'Embargos à Execução', 15, TRUE, 'Art. 915, CPC', 'resposta', ARRAY['embargos à execução', 'embargos do devedor']),
('emenda_inicial', 'Emenda à Inicial', 15, TRUE, 'Art. 321, CPC', 'manifestacao', ARRAY['emenda', 'emendar', 'emenda à inicial', 'regularizar inicial']),
('pagamento_voluntario', 'Pagamento Voluntário', 3, TRUE, 'Art. 523, CPC', 'manifestacao', ARRAY['pagamento voluntário', 'pagar voluntariamente', 'efetuar pagamento']),
('manifestacao_generica', 'Manifestação', 15, TRUE, 'Art. 218, CPC', 'manifestacao', ARRAY['manifestar', 'manifestação', 'ciência']),
('alegacoes_finais', 'Alegações Finais', 15, TRUE, 'Art. 364, CPC', 'manifestacao', ARRAY['alegações finais', 'razões finais', 'memoriais']),
('contrarrazoes', 'Contrarrazões', 15, TRUE, 'Art. 1.010, CPC', 'resposta', ARRAY['contrarrazões', 'contrarrazões de recurso']),
('reconvencao', 'Reconvenção', 15, TRUE, 'Art. 343, CPC', 'resposta', ARRAY['reconvenção', 'reconvir']);

-- 2. Tabela de Feriados Forenses
CREATE TABLE public.feriados_forenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('nacional', 'estadual', 'municipal', 'forense')),
  uf TEXT,
  tribunal_sigla TEXT,
  recorrente BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir feriados nacionais 2025
INSERT INTO public.feriados_forenses (tenant_id, data, descricao, tipo, recorrente) VALUES
(NULL, '2025-01-01', 'Confraternização Universal', 'nacional', TRUE),
(NULL, '2025-03-03', 'Carnaval (Segunda)', 'nacional', FALSE),
(NULL, '2025-03-04', 'Carnaval (Terça)', 'nacional', FALSE),
(NULL, '2025-04-18', 'Sexta-feira Santa', 'nacional', FALSE),
(NULL, '2025-04-21', 'Tiradentes', 'nacional', TRUE),
(NULL, '2025-05-01', 'Dia do Trabalho', 'nacional', TRUE),
(NULL, '2025-06-19', 'Corpus Christi', 'nacional', FALSE),
(NULL, '2025-09-07', 'Independência do Brasil', 'nacional', TRUE),
(NULL, '2025-10-12', 'Nossa Senhora Aparecida', 'nacional', TRUE),
(NULL, '2025-11-02', 'Finados', 'nacional', TRUE),
(NULL, '2025-11-15', 'Proclamação da República', 'nacional', TRUE),
(NULL, '2025-12-25', 'Natal', 'nacional', TRUE);

-- Inserir feriados nacionais 2026
INSERT INTO public.feriados_forenses (tenant_id, data, descricao, tipo, recorrente) VALUES
(NULL, '2026-01-01', 'Confraternização Universal', 'nacional', TRUE),
(NULL, '2026-02-16', 'Carnaval (Segunda)', 'nacional', FALSE),
(NULL, '2026-02-17', 'Carnaval (Terça)', 'nacional', FALSE),
(NULL, '2026-04-03', 'Sexta-feira Santa', 'nacional', FALSE),
(NULL, '2026-04-21', 'Tiradentes', 'nacional', TRUE),
(NULL, '2026-05-01', 'Dia do Trabalho', 'nacional', TRUE),
(NULL, '2026-06-04', 'Corpus Christi', 'nacional', FALSE),
(NULL, '2026-09-07', 'Independência do Brasil', 'nacional', TRUE),
(NULL, '2026-10-12', 'Nossa Senhora Aparecida', 'nacional', TRUE),
(NULL, '2026-11-02', 'Finados', 'nacional', TRUE),
(NULL, '2026-11-15', 'Proclamação da República', 'nacional', TRUE),
(NULL, '2026-12-25', 'Natal', 'nacional', TRUE);

-- Inserir recesso forense 2024-2025
INSERT INTO public.feriados_forenses (tenant_id, data, descricao, tipo, recorrente) 
SELECT NULL, d::DATE, 'Recesso Forense', 'forense', FALSE
FROM generate_series('2024-12-20'::DATE, '2025-01-06'::DATE, '1 day'::INTERVAL) d;

-- Inserir recesso forense 2025-2026
INSERT INTO public.feriados_forenses (tenant_id, data, descricao, tipo, recorrente) 
SELECT NULL, d::DATE, 'Recesso Forense', 'forense', FALSE
FROM generate_series('2025-12-20'::DATE, '2026-01-06'::DATE, '1 day'::INTERVAL) d;

-- 3. Adicionar colunas de automação em processos_oab
ALTER TABLE public.processos_oab 
ADD COLUMN IF NOT EXISTS prazo_automatico_ativo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS prazo_advogado_responsavel_id UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS prazo_usuarios_marcados UUID[] DEFAULT '{}'::UUID[];

-- 4. Tabela de Log de Prazos Automatizados
CREATE TABLE public.prazos_automaticos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_oab_id UUID REFERENCES public.processos_oab(id) ON DELETE CASCADE,
  andamento_id UUID REFERENCES public.processos_oab_andamentos(id) ON DELETE SET NULL,
  deadline_id UUID REFERENCES public.deadlines(id) ON DELETE SET NULL,
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('intimacao', 'audiencia')),
  tipo_ato_detectado TEXT,
  prazo_dias INTEGER,
  data_inicio DATE,
  data_fim DATE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Função para calcular prazo em dias úteis
CREATE OR REPLACE FUNCTION public.calcular_prazo_dias_uteis(
  p_data_inicio DATE,
  p_prazo_dias INTEGER,
  p_tenant_id UUID DEFAULT NULL,
  p_tribunal_sigla TEXT DEFAULT NULL
) RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_atual DATE := p_data_inicio;
  v_dias_contados INTEGER := 0;
BEGIN
  WHILE v_dias_contados < p_prazo_dias LOOP
    v_data_atual := v_data_atual + 1;
    
    -- Pular sábado (6) e domingo (0)
    IF EXTRACT(DOW FROM v_data_atual) NOT IN (0, 6) THEN
      -- Verificar se não é feriado
      IF NOT EXISTS (
        SELECT 1 FROM feriados_forenses f
        WHERE f.data = v_data_atual
          AND f.ativo = TRUE
          AND (f.tenant_id = p_tenant_id OR f.tenant_id IS NULL)
          AND (f.tribunal_sigla IS NULL OR f.tribunal_sigla = p_tribunal_sigla)
      ) THEN
        v_dias_contados := v_dias_contados + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_data_atual;
END;
$$;

-- 6. RLS Policies para prazos_processuais_cpc (tabela global, apenas leitura)
ALTER TABLE public.prazos_processuais_cpc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prazos_cpc_select" ON public.prazos_processuais_cpc
FOR SELECT USING (TRUE);

-- 7. RLS Policies para feriados_forenses
ALTER TABLE public.feriados_forenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feriados_select" ON public.feriados_forenses
FOR SELECT USING (tenant_id IS NULL OR tenant_id = get_user_tenant_id());

CREATE POLICY "feriados_insert" ON public.feriados_forenses
FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "feriados_update" ON public.feriados_forenses
FOR UPDATE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "feriados_delete" ON public.feriados_forenses
FOR DELETE USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 8. RLS Policies para prazos_automaticos_log
ALTER TABLE public.prazos_automaticos_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_select" ON public.prazos_automaticos_log
FOR SELECT USING (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

CREATE POLICY "log_insert" ON public.prazos_automaticos_log
FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_tenant_id());

-- 9. Índices para performance
CREATE INDEX IF NOT EXISTS idx_feriados_data ON public.feriados_forenses(data);
CREATE INDEX IF NOT EXISTS idx_feriados_tenant ON public.feriados_forenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prazos_log_processo ON public.prazos_automaticos_log(processo_oab_id);
CREATE INDEX IF NOT EXISTS idx_processos_prazo_auto ON public.processos_oab(prazo_automatico_ativo) WHERE prazo_automatico_ativo = TRUE;