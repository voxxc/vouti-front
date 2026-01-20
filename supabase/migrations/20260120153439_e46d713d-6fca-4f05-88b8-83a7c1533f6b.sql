-- ETAPA 1: Redirecionar reuniões para o lead mais antigo (antes de deletar duplicados)
-- Usando subquery com ORDER BY created_at para encontrar o mais antigo
WITH lead_correto AS (
  SELECT DISTINCT ON (nome, telefone)
    nome,
    telefone,
    id as id_manter
  FROM reuniao_clientes
  WHERE telefone IS NOT NULL 
    AND telefone != ''
    AND (nome, telefone) IN (
      SELECT nome, telefone 
      FROM reuniao_clientes
      WHERE telefone IS NOT NULL AND telefone != ''
      GROUP BY nome, telefone 
      HAVING COUNT(*) > 1
    )
  ORDER BY nome, telefone, created_at ASC
),
leads_duplicados AS (
  SELECT rc.id as id_duplicado, lc.id_manter
  FROM reuniao_clientes rc
  JOIN lead_correto lc ON rc.nome = lc.nome AND rc.telefone = lc.telefone
  WHERE rc.id != lc.id_manter
)
UPDATE reunioes
SET cliente_id = ld.id_manter
FROM leads_duplicados ld
WHERE reunioes.cliente_id = ld.id_duplicado;

-- ETAPA 2: Deletar leads duplicados (mantendo o mais antigo)
WITH duplicados AS (
  SELECT 
    id,
    nome,
    telefone,
    ROW_NUMBER() OVER (PARTITION BY nome, telefone ORDER BY created_at ASC) as rn
  FROM reuniao_clientes
  WHERE telefone IS NOT NULL 
    AND telefone != ''
    AND (nome, telefone) IN (
      SELECT nome, telefone
      FROM reuniao_clientes
      WHERE telefone IS NOT NULL AND telefone != ''
      GROUP BY nome, telefone
      HAVING COUNT(*) > 1
    )
)
DELETE FROM reuniao_clientes
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);

-- ETAPA 3: Mover conteúdo do email para observações quando email não é válido
UPDATE reuniao_clientes
SET 
  observacoes = CASE 
    WHEN observacoes IS NULL OR observacoes = '' THEN email
    ELSE observacoes || E'\n\n--- Dados anteriormente no campo email ---\n' || email
  END,
  email = NULL
WHERE email IS NOT NULL 
  AND email != ''
  AND email NOT LIKE '%@%';

-- ETAPA 4: Associar status_id baseado no campo status (texto) para reuniões sem status_id
UPDATE reunioes r
SET status_id = rs.id
FROM reuniao_status rs
WHERE r.status_id IS NULL
  AND r.tenant_id = rs.tenant_id
  AND LOWER(TRIM(r.status)) = LOWER(TRIM(rs.nome));