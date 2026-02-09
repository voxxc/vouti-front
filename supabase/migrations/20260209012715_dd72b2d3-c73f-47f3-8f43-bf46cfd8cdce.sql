-- Permitir user_id nulo na tabela whatsapp_messages
-- Isso permite que mensagens do bot/webhook/Super Admin sejam salvas sem user_id
ALTER TABLE whatsapp_messages 
ALTER COLUMN user_id DROP NOT NULL;