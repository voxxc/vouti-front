-- Adicionar coluna processo_oab_id na tabela project_protocolos para vínculo com processos
ALTER TABLE project_protocolos 
ADD COLUMN processo_oab_id uuid REFERENCES processos_oab(id) ON DELETE SET NULL;