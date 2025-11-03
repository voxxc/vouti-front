-- Criar tabela de templates de setores
CREATE TABLE IF NOT EXISTS sector_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE sector_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies para sector_templates
CREATE POLICY "Users can view their own sector templates"
  ON sector_templates FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own sector templates"
  ON sector_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own sector templates"
  ON sector_templates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own sector templates"
  ON sector_templates FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all sector templates"
  ON sector_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all sector templates"
  ON sector_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna template_id em project_sectors
ALTER TABLE project_sectors 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES sector_templates(id) ON DELETE CASCADE;

-- Índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_project_sectors_template_id ON project_sectors(template_id);

-- Função para criar setores em novos projetos
CREATE OR REPLACE FUNCTION create_sectors_for_new_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir setores baseados nos templates do usuário
  INSERT INTO project_sectors (project_id, template_id, name, description, sector_order, is_default, created_by)
  SELECT 
    NEW.id,
    st.id,
    st.name,
    st.description,
    ROW_NUMBER() OVER (ORDER BY st.created_at),
    false,
    NEW.created_by
  FROM sector_templates st
  WHERE st.created_by = NEW.created_by;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar setores automaticamente em novos projetos
DROP TRIGGER IF EXISTS trigger_create_sectors_for_new_project ON projects;
CREATE TRIGGER trigger_create_sectors_for_new_project
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_sectors_for_new_project();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_sector_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para updated_at
CREATE TRIGGER update_sector_templates_updated_at
BEFORE UPDATE ON sector_templates
FOR EACH ROW
EXECUTE FUNCTION update_sector_templates_updated_at();