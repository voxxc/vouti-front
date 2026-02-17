-- Limpar configs de IA tenant-level órfãs (sem agent_id) que foram substituídas pelo modelo per-agent
DELETE FROM whatsapp_ai_config
WHERE agent_id IS NULL
  AND tenant_id IS NOT NULL;