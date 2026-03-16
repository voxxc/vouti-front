ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_origem_tipo_check;

UPDATE clientes SET origem_tipo = 'instagram_organico' WHERE origem_tipo = 'instagram';
UPDATE clientes SET origem_tipo = 'facebook_organico' WHERE origem_tipo = 'facebook';

ALTER TABLE clientes ADD CONSTRAINT clientes_origem_tipo_check 
  CHECK (origem_tipo IS NULL OR origem_tipo IN ('instagram_organico', 'instagram_trafego', 'facebook_organico', 'facebook_trafego', 'indicacao', 'outro'));