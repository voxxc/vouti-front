-- Habilitar REPLICA IDENTITY FULL para capturar todos os campos em eventos UPDATE
ALTER TABLE processos_oab_andamentos REPLICA IDENTITY FULL;

-- Adicionar a tabela na publicação realtime do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE processos_oab_andamentos;