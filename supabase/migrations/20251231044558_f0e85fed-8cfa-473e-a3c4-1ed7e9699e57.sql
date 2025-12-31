-- Habilitar Vouti IA para o tenant TESTE
INSERT INTO tenant_ai_settings (tenant_id, ai_enabled)
VALUES ('e33d4546-5d2e-4eaa-ab85-382c5ca33012', true)
ON CONFLICT (tenant_id) DO UPDATE SET ai_enabled = true;