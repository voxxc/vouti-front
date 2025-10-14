-- Permitir que usuários deletem suas próprias mensagens do WhatsApp
CREATE POLICY "Users can delete their own WhatsApp messages"
ON whatsapp_messages
FOR DELETE
USING (auth.uid() = user_id);