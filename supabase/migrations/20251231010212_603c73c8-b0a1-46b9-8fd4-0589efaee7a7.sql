-- Atualizar processos_oab onde parte_ativa/parte_passiva estão vazios mas temos dados em capa_completa
UPDATE processos_oab
SET 
  parte_ativa = CASE
    -- Se é 2ª instância ou superior e tem nome na raiz, usar como parte ativa
    WHEN (capa_completa->>'instance')::int >= 2 
         AND capa_completa->>'name' IS NOT NULL 
         AND capa_completa->>'name' != ''
    THEN capa_completa->>'name'
    
    -- Se tem parties com side = 'Active', 'Interested' ou 'Plaintiff', extrair primeiro nome
    WHEN capa_completa->'parties' IS NOT NULL 
         AND jsonb_typeof(capa_completa->'parties') = 'array'
         AND jsonb_array_length(capa_completa->'parties') > 0
    THEN COALESCE(
      (SELECT p->>'name' 
       FROM jsonb_array_elements(capa_completa->'parties') p
       WHERE LOWER(COALESCE(p->>'side', '')) IN ('active', 'interested', 'plaintiff')
       LIMIT 1),
      capa_completa->>'name',
      'A definir'
    )
    
    -- Fallback: usar nome da raiz se existir
    WHEN capa_completa->>'name' IS NOT NULL AND capa_completa->>'name' != ''
    THEN capa_completa->>'name'
    
    ELSE 'A definir'
  END,
  
  parte_passiva = CASE
    -- Se é 2ª instância com parties "Interested", marcar como recursal
    WHEN (capa_completa->>'instance')::int >= 2 
         AND capa_completa->'parties' IS NOT NULL
         AND jsonb_typeof(capa_completa->'parties') = 'array'
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(capa_completa->'parties') p
           WHERE LOWER(COALESCE(p->>'side', '')) = 'interested'
         )
    THEN '(Processo recursal)'
    
    -- Se tem parties com side = 'Passive' ou 'Defendant', extrair primeiro nome
    WHEN capa_completa->'parties' IS NOT NULL 
         AND jsonb_typeof(capa_completa->'parties') = 'array'
         AND jsonb_array_length(capa_completa->'parties') > 0
    THEN COALESCE(
      (SELECT p->>'name' 
       FROM jsonb_array_elements(capa_completa->'parties') p
       WHERE LOWER(COALESCE(p->>'side', '')) IN ('passive', 'defendant')
       LIMIT 1),
      '(Processo recursal)'
    )
    
    -- Fallback para 2ª instância
    WHEN (capa_completa->>'instance')::int >= 2
    THEN '(Processo recursal)'
    
    ELSE 'A definir'
  END
  
WHERE (parte_ativa IS NULL OR parte_ativa = '' OR parte_ativa = 'A definir' OR parte_ativa = 'Autor não identificado')
  AND capa_completa IS NOT NULL;