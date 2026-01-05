-- Deletar clientes duplicados com 0 reuniões
-- Estes são registros criados por múltiplos cliques no botão de cadastrar

DELETE FROM reuniao_clientes 
WHERE id IN (
  -- RONALDO DELFRATE SANTOS (9 duplicados sem reunião)
  'bd764171-79ed-4cb1-baba-bc6a32ad4a1e',
  'e2144a85-8e24-498c-8029-a83f479800b7',
  '00ebf967-45c6-48e5-ae64-a40f1be666fe',
  '449f13f0-d321-4cdb-860e-188248af5219',
  'd47f201a-a923-47c3-b79f-c022e5867829',
  '15fcc069-a3d6-4ef8-89f2-9194cb991f34',
  'fbef6922-ff62-4a30-849c-f6333277dd1e',
  '9680595f-7691-4c5c-8909-7316fbe2c03b',
  '7ca3b483-b10d-47b9-bffa-65b966fc0c42',
  -- CLEZIO LEANDRO RISSOTTI (duplicado)
  'a4cb85fc-cefd-486a-9d45-3be94147b35e',
  -- VERVI CASTILHO (duplicado)
  'cd0b4123-bbcf-4b86-ab30-1527b4da72e1',
  -- dd (duplicado)
  'b2dc2a71-9d0e-4861-aba9-7a5fcda38630',
  -- ELISANGELA CRISTINA KIETZER (duplicado)
  'febb38ae-74e7-41ad-82d5-84234a5243b2',
  -- LEAD/RURAL SILVIO BRANDÃO (3 duplicados)
  '9cb98705-d52e-49f4-809d-fbcba53745e4',
  'bb544317-4b21-4a34-acad-e95735d7f706',
  '165e6982-db50-4dda-854b-7d1ab8f52af2',
  -- LEONARDO BRITO (5 duplicados)
  'd4b7cf7d-179e-433d-b1f0-1569a3c1cc79',
  '7d71adfe-4659-4a63-8d4a-099872d47005',
  '234fbb9d-ad2d-4f25-b336-cb3f10c7b9d6',
  'd034beb6-cf3d-4a0e-a9d9-8c7a716196bd',
  '760cb8ac-3283-489c-8bba-a290e2695578'
);