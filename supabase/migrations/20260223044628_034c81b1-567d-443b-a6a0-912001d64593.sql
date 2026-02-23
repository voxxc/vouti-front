
CREATE TABLE task_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  reply_to_id UUID REFERENCES task_comentarios(id) ON DELETE SET NULL,
  mentioned_user_ids UUID[] DEFAULT '{}',
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE task_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_task_comentarios" ON task_comentarios
  FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE TRIGGER update_task_comentarios_updated_at
  BEFORE UPDATE ON task_comentarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
