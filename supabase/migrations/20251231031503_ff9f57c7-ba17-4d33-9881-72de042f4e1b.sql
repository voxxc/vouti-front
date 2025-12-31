-- Habilitar REPLICA IDENTITY FULL para capturar todos os dados nas mudanças
ALTER TABLE projects REPLICA IDENTITY FULL;

-- Adicionar tabela à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE projects;