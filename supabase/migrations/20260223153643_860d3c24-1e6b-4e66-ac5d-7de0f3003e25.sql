CREATE INDEX IF NOT EXISTS idx_processos_oab_tenant_id ON processos_oab(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processos_oab_andamentos_lida ON processos_oab_andamentos(lida) WHERE lida = false;