-- Remover danieldemorais.e@gmail.com da tabela super_admins
-- Manter apenas danieldemorais@vouti.co como super admin
DELETE FROM super_admins 
WHERE user_id IN (
  SELECT user_id FROM profiles WHERE email = 'danieldemorais.e@gmail.com'
);