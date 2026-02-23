
CREATE TABLE processo_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id UUID NOT NULL REFERENCES processos_oab(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  reply_to_id UUID REFERENCES processo_comentarios(id) ON DELETE SET NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE processo_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_processo_comentarios" ON processo_comentarios
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE TRIGGER update_processo_comentarios_updated_at
  BEFORE UPDATE ON processo_comentarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE project_carteiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#6366f1',
  ordem INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE project_carteira_processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carteira_id UUID NOT NULL REFERENCES project_carteiras(id) ON DELETE CASCADE,
  project_processo_id UUID NOT NULL REFERENCES project_processos(id) ON DELETE CASCADE,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carteira_id, project_processo_id)
);

ALTER TABLE project_carteiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_carteira_processos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_carteiras" ON project_carteiras
  FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_carteira_processos" ON project_carteira_processos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_carteiras pc
      WHERE pc.id = carteira_id AND pc.tenant_id = get_user_tenant_id()
    )
  );
