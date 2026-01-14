-- Tornar project_id nullable na tabela deadlines para permitir prazos da controladoria sem projeto
ALTER TABLE public.deadlines ALTER COLUMN project_id DROP NOT NULL;