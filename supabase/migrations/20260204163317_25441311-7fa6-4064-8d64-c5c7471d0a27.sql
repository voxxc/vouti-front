-- Adicionar role 'controller' para Heloise no tenant Solvenza
INSERT INTO user_roles (user_id, role, tenant_id, is_primary)
VALUES (
  '3be82b03-5931-4a0a-b9f9-a83c666cf93f',  -- Heloise
  'controller',
  '27492091-e05d-46a8-9ee8-b3b47ec894e4',  -- Solvenza
  false  -- Não é a role principal
);