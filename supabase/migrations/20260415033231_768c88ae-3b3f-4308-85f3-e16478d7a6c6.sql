-- Data fix: vincular PROJUDI TJPR na SOLVENZA
UPDATE public.credenciais_cliente
SET system_name = 'PROJUDI TJPR - 1º grau'
WHERE id = '7433c021-9226-429c-9e45-145ec11b4f90' AND system_name IS NULL;

UPDATE public.credenciais_judit
SET credencial_cliente_id = '7433c021-9226-429c-9e45-145ec11b4f90'
WHERE id = '5d8c5cd6-482b-469b-80fe-81ce04a0dd30' AND credencial_cliente_id IS NULL;