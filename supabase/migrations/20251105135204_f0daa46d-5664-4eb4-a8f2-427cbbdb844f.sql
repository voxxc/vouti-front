-- Padronizar status de processos na tabela controladoria_processos
-- A tabela tinha constraint antiga com valores: 'ativo', 'aguardando', 'arquivado', 'vencido'
-- Precisamos atualizar para os valores padronizados do sistema

-- 1. Remover constraint antiga
ALTER TABLE public.controladoria_processos
DROP CONSTRAINT IF EXISTS valid_status;

-- 2. Atualizar status antigos para os novos valores padronizados
UPDATE public.controladoria_processos 
SET status = 'em_andamento', updated_at = NOW()
WHERE status = 'ativo';

UPDATE public.controladoria_processos 
SET status = 'finalizado', updated_at = NOW()
WHERE status = 'vencido';

-- Manter 'arquivado' como está (já é um valor válido)
-- Manter 'aguardando' se existir (pode ser convertido para em_andamento se necessário)

-- 3. Adicionar constraint com valores padronizados do sistema
ALTER TABLE public.controladoria_processos
ADD CONSTRAINT controladoria_processos_status_check 
CHECK (status IN ('em_andamento', 'suspenso', 'arquivado', 'finalizado', 'conciliacao', 'sentenca', 'transito_julgado', 'aguardando'));