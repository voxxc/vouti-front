INSERT INTO whatsapp_messages (
  instance_name,
  message_id,
  from_number,
  to_number,
  message_text,
  direction,
  user_id,
  tenant_id,
  agent_id,
  created_at
) VALUES (
  'superadmin-5ee34df4-f07a-4c9b-a8ec-5a218ca812a9',
  'manual_recovery_' || gen_random_uuid(),
  '5545999180026',
  '5545999180026',
  'Olá, Laura Dama, Tudo bom ?

Sou do atendimento do Vouti. Vi que você acabou de conhecer nossa plataforma.

Antes de encaminhar para um especialista, queria entender um pouco da sua rotina: hoje você já utiliza alguma plataforma para gerenciar o dia a dia do seu escritório?',
  'outgoing',
  '8eda80fa-0319-4791-923e-551052282e62',
  NULL,
  '5ee34df4-f07a-4c9b-a8ec-5a218ca812a9',
  '2026-02-09 10:21:00.859+00'
);