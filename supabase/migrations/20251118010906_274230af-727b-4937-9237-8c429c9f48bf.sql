-- FASE 1: Adicionar setor "Acordos" aos projetos existentes que não possuem
INSERT INTO project_sectors (project_id, name, description, sector_order, is_default, created_by)
SELECT 
  p.id,
  'Acordos',
  'Setor para gerenciar acordos e processos',
  999,
  true,
  p.created_by
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_sectors ps 
  WHERE ps.project_id = p.id AND ps.name = 'Acordos'
);

-- FASE 2: Criar função para adicionar setor "Acordos" automaticamente em novos projetos
CREATE OR REPLACE FUNCTION create_default_acordos_sector()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir setor de Acordos como padrão
  INSERT INTO project_sectors (project_id, name, description, sector_order, is_default, created_by)
  VALUES (
    NEW.id,
    'Acordos',
    'Setor para gerenciar acordos e processos',
    999,
    true,
    NEW.created_by
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FASE 2: Criar trigger para executar a função após inserção de novo projeto
DROP TRIGGER IF EXISTS trigger_create_acordos_sector ON projects;

CREATE TRIGGER trigger_create_acordos_sector
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_default_acordos_sector();