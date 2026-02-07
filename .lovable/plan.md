

# Registrar Tracking Request ID no Banco de IDs

## Objetivo
Quando a Edge Function `judit-sync-monitorados` atualiza o campo `tracking_request_id` de um processo, esse ID também deve ser automaticamente registrado na tabela `tenant_banco_ids` para auditoria.

---

## Mudanças Necessárias

### 1. Adicionar Novo Tipo ao Constraint

O constraint `tenant_banco_ids_tipo_check` precisa incluir o novo tipo `request_tracking`:

```sql
ALTER TABLE tenant_banco_ids DROP CONSTRAINT IF EXISTS tenant_banco_ids_tipo_check;
ALTER TABLE tenant_banco_ids ADD CONSTRAINT tenant_banco_ids_tipo_check 
  CHECK (tipo IN (
    'oab', 
    'processo', 
    'tracking', 
    'tracking_desativado', 
    'request_busca', 
    'request_detalhes', 
    'request_tracking',  -- NOVO
    'push_doc', 
    'tracking_push_doc'
  ));
```

### 2. Atualizar Trigger `registrar_banco_id_processo`

Adicionar lógica para capturar mudanças no campo `tracking_request_id`:

```sql
-- No INSERT: se tracking_request_id já veio preenchido
IF NEW.tracking_request_id IS NOT NULL THEN
  INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
  VALUES (
    NEW.tenant_id,
    'request_tracking',
    NEW.id,
    NEW.tracking_request_id,
    'Request Tracking: ' || COALESCE(NEW.numero_cnj, 'Processo'),
    jsonb_build_object(
      'numero_cnj', NEW.numero_cnj, 
      'tracking_id', NEW.tracking_id,
      'data_request', NEW.tracking_request_data
    )
  );
END IF;

-- No UPDATE: quando tracking_request_id muda
IF TG_OP = 'UPDATE' 
   AND NEW.tracking_request_id IS DISTINCT FROM OLD.tracking_request_id 
   AND NEW.tracking_request_id IS NOT NULL THEN
  INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
  VALUES (
    NEW.tenant_id,
    'request_tracking',
    NEW.id,
    NEW.tracking_request_id,
    'Request Tracking: ' || COALESCE(NEW.numero_cnj, 'Processo'),
    jsonb_build_object(
      'numero_cnj', NEW.numero_cnj, 
      'tracking_id', NEW.tracking_id,
      'data_request', NEW.tracking_request_data
    )
  );
END IF;
```

### 3. Migrar Dados Existentes

Se já existem processos com `tracking_request_id` preenchido que ainda não foram registrados:

```sql
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata)
SELECT 
  po.tenant_id,
  'request_tracking',
  po.id,
  po.tracking_request_id,
  'Request Tracking: ' || po.numero_cnj,
  jsonb_build_object(
    'numero_cnj', po.numero_cnj, 
    'tracking_id', po.tracking_id,
    'data_request', po.tracking_request_data
  )
FROM processos_oab po
WHERE po.tracking_request_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_banco_ids tbi 
    WHERE tbi.external_id = po.tracking_request_id 
      AND tbi.tipo = 'request_tracking'
  );
```

---

## Resultado no Banco de IDs

A aba "Requests" no TenantCard mostrará dois tipos de requests:

| Tipo | Descrição |
|------|-----------|
| `request_detalhes` | Request IDs de buscas avulsas (POST /lawsuit_cnj) |
| `request_tracking` | Request IDs obtidos via monitoramento (GET /tracking) |

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Atualizar constraint + trigger + migrar dados existentes |

---

## Fluxo Completo

```text
1. Edge Function sync chama GET /tracking/{id}
2. Obtém request_id da resposta
3. Atualiza processos_oab.tracking_request_id
4. Trigger dispara automaticamente
5. Novo registro em tenant_banco_ids (tipo: request_tracking)
6. SuperAdmin vê no Banco de IDs do tenant
```

