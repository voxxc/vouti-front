-- FASE 1: RESETAR CONFIGURAÇÕES ANTIGAS E ATUALIZAR SCHEMA

-- 1.1 Limpar dados antigos (apenas registros sem user_id)
DELETE FROM whatsapp_instances WHERE user_id IS NULL;
DELETE FROM whatsapp_messages WHERE user_id IS NULL;

-- 1.2 Adicionar campo is_read em whatsapp_messages
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- 1.3 Tornar user_id obrigatório em whatsapp_messages
ALTER TABLE whatsapp_messages
ALTER COLUMN user_id SET NOT NULL;

-- 1.4 Tornar user_id obrigatório em whatsapp_instances e adicionar default
ALTER TABLE whatsapp_instances
ALTER COLUMN user_id SET DEFAULT auth.uid(),
ALTER COLUMN user_id SET NOT NULL;

-- 1.5 Atualizar RLS policies para whatsapp_messages incluindo inserção via sistema
DROP POLICY IF EXISTS "System can insert whatsapp messages" ON whatsapp_messages;
CREATE POLICY "System can insert whatsapp messages"
ON whatsapp_messages
FOR INSERT
WITH CHECK (true);

-- 1.6 Adicionar policy de update para marcar mensagens como lidas
DROP POLICY IF EXISTS "Users can update their own messages" ON whatsapp_messages;
CREATE POLICY "Users can update their own messages"
ON whatsapp_messages
FOR UPDATE
USING (auth.uid() = user_id);