-- Corrigir dados orfaos mais criticos apenas
UPDATE user_roles 
SET tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = user_roles.user_id LIMIT 1)
WHERE tenant_id IS NULL AND user_id IS NOT NULL;

UPDATE grupos_acoes 
SET tenant_id = (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE tribunais 
SET tenant_id = (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE comarcas 
SET tenant_id = (SELECT id FROM tenants WHERE is_active = true ORDER BY created_at LIMIT 1)
WHERE tenant_id IS NULL;