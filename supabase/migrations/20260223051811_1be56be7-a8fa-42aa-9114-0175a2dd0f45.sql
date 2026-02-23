
-- Remover indice parcial existente
DROP INDEX IF EXISTS idx_whatsapp_contacts_tenant_phone;

-- Criar constraint unica real (que funciona com ON CONFLICT)
ALTER TABLE whatsapp_contacts
  ADD CONSTRAINT whatsapp_contacts_tenant_phone_unique
  UNIQUE (tenant_id, phone);
