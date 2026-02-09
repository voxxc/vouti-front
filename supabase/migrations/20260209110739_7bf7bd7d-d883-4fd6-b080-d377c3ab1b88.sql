-- Corrigir números de telefone com formato incompleto (sem 9º dígito)
-- Laura Dama: 554599180026 → 5545999180026
UPDATE whatsapp_messages
SET from_number = '5545999180026'
WHERE from_number = '554599180026'
  AND tenant_id IS NULL;

-- Corrigir qualquer outro número com 12 dígitos existente no banco
-- Padrão: 55 + DDD(2) + 8 dígitos → adicionar 9 após DDD
UPDATE whatsapp_messages
SET from_number = CONCAT(
  SUBSTRING(from_number FROM 1 FOR 4),
  '9',
  SUBSTRING(from_number FROM 5)
)
WHERE LENGTH(from_number) = 12
  AND from_number LIKE '55%'
  AND from_number NOT LIKE '5545999%';