
-- Limpar logs de prazos automaticos incorretos/duplicados
DELETE FROM prazos_automaticos_log 
WHERE deadline_id IN (
  'c3584228-298d-4bc9-8c8b-369352ee9369',
  '8f2052c7-073b-4253-84c8-f7eee2f21058',
  '2c62269d-4a35-40b1-8909-f7b7c02332b6',
  '495d2e36-3251-43d3-904b-f046494f3893',
  '80a89305-af19-4430-b9e4-4848fde7171b'
);

-- Remover tags associadas
DELETE FROM deadline_tags 
WHERE deadline_id IN (
  'c3584228-298d-4bc9-8c8b-369352ee9369',
  '8f2052c7-073b-4253-84c8-f7eee2f21058',
  '2c62269d-4a35-40b1-8909-f7b7c02332b6',
  '495d2e36-3251-43d3-904b-f046494f3893',
  '80a89305-af19-4430-b9e4-4848fde7171b'
);

-- Remover deadlines falsos positivos (data 03/02) e duplicatas (05/20)
DELETE FROM deadlines 
WHERE id IN (
  'c3584228-298d-4bc9-8c8b-369352ee9369',
  '8f2052c7-073b-4253-84c8-f7eee2f21058',
  '2c62269d-4a35-40b1-8909-f7b7c02332b6',
  '495d2e36-3251-43d3-904b-f046494f3893',
  '80a89305-af19-4430-b9e4-4848fde7171b'
);
