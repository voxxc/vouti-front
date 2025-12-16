-- Adicionar campos para controle preciso do primeiro pagamento
ALTER TABLE colaboradores 
ADD COLUMN IF NOT EXISTS data_primeiro_pagamento DATE,
ADD COLUMN IF NOT EXISTS primeiro_mes_proporcional BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dias_trabalhados_primeiro_mes INTEGER;