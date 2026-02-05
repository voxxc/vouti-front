
# Registrar Request ID de Detalhes no INSERT

## Problema Identificado

O processo `0003732-65.2024.8.16.0021` foi criado via POST com `detalhes_request_id` = `7d0309a0-dc93-4d99-9334-cf3f0ebea19d`, mas esse request_id **nao aparece no Banco de IDs** do SuperAdmin.

**Causa**: O trigger `registrar_banco_id_processo` so registra `detalhes_request_id` quando ocorre **UPDATE** (campo muda de valor). Para **INSERTs** que ja vem com o request_id preenchido, o trigger nao captura.

---

## Solucao

Modificar o trigger para tambem registrar `detalhes_request_id` no **INSERT** (quando o processo ja vem com esse campo preenchido).

---

## Alteracoes Tecnicas

### 1. Migracao SQL: Atualizar Trigger

```sql
CREATE OR REPLACE FUNCTION public.registrar_banco_id_processo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- INSERT: registrar ID do processo
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'processo',
      NEW.id,
      NEW.id::text,
      COALESCE(NEW.numero_cnj, 'Processo sem CNJ'),
      jsonb_build_object('numero_cnj', NEW.numero_cnj, 'tribunal', NEW.tribunal)
    );
    
    -- NOVO: Registrar detalhes_request_id se ja veio preenchido no INSERT
    IF NEW.detalhes_request_id IS NOT NULL THEN
      INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
      VALUES (
        NEW.tenant_id,
        'request_detalhes',
        NEW.id,
        NEW.detalhes_request_id,
        'Detalhes: ' || COALESCE(NEW.numero_cnj, 'Processo'),
        jsonb_build_object('numero_cnj', NEW.numero_cnj)
      );
    END IF;
    
    -- NOVO: Registrar tracking_id se ja veio preenchido no INSERT
    IF NEW.tracking_id IS NOT NULL THEN
      INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
      VALUES (
        NEW.tenant_id,
        'tracking',
        NEW.id,
        NEW.tracking_id,
        'Monitoramento: ' || COALESCE(NEW.numero_cnj, 'Processo'),
        jsonb_build_object('numero_cnj', NEW.numero_cnj, 'monitoramento_ativo', NEW.monitoramento_ativo)
      );
    END IF;
  END IF;
  
  -- UPDATE: registrar tracking_id se ativou monitoramento
  IF TG_OP = 'UPDATE' AND NEW.tracking_id IS DISTINCT FROM OLD.tracking_id AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'tracking',
      NEW.id,
      NEW.tracking_id,
      'Monitoramento: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object('numero_cnj', NEW.numero_cnj, 'monitoramento_ativo', NEW.monitoramento_ativo)
    );
  END IF;
  
  -- Registrar quando monitoramento foi DESATIVADO
  IF TG_OP = 'UPDATE' 
     AND OLD.monitoramento_ativo = TRUE 
     AND NEW.monitoramento_ativo = FALSE 
     AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'tracking_desativado',
      NEW.id,
      NEW.tracking_id,
      'Desativado: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object(
        'numero_cnj', NEW.numero_cnj, 
        'tracking_id', NEW.tracking_id,
        'desativado_em', NOW()
      )
    );
  END IF;
  
  -- UPDATE: registrar detalhes_request_id se buscou detalhes
  IF TG_OP = 'UPDATE' AND NEW.detalhes_request_id IS DISTINCT FROM OLD.detalhes_request_id AND NEW.detalhes_request_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
    VALUES (
      NEW.tenant_id,
      'request_detalhes',
      NEW.id,
      NEW.detalhes_request_id,
      'Detalhes: ' || COALESCE(NEW.numero_cnj, 'Processo'),
      jsonb_build_object('numero_cnj', NEW.numero_cnj)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
```

### 2. Correcao Retroativa: Inserir o Request ID Faltante

Para corrigir o processo que ja existe:

```sql
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
SELECT 
  po.tenant_id,
  'request_detalhes',
  po.id,
  po.detalhes_request_id,
  'Detalhes: ' || po.numero_cnj,
  jsonb_build_object('numero_cnj', po.numero_cnj)
FROM processos_oab po
WHERE po.numero_cnj = '0003732-65.2024.8.16.0021'
  AND po.detalhes_request_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_banco_ids tbi 
    WHERE tbi.external_id = po.detalhes_request_id 
      AND tbi.tipo = 'request_detalhes'
  );
```

---

## Resumo das Mudancas

| Cenario | Antes | Depois |
|---------|-------|--------|
| INSERT com detalhes_request_id | Nao registra | Registra request_detalhes |
| INSERT com tracking_id | Nao registra | Registra tracking |
| UPDATE com detalhes_request_id | Registra | Registra (sem mudanca) |
| UPDATE com tracking_id | Registra | Registra (sem mudanca) |

---

## Resultado Esperado

- Ao abrir o Banco de IDs no SuperAdmin, a aba **Requests** vai mostrar o request_id `7d0309a0-dc93-4d99-9334-cf3f0ebea19d` para o processo `0003732-65.2024.8.16.0021`
- Novos processos criados via POST (atualizar-andamentos ou import CNJ) terao seus request_ids registrados automaticamente
