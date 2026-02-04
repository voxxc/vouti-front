
# Plano: Registrar Desativação de Monitoramento no Banco de IDs

## Situação Atual

### O que já funciona:
| Ação | Registrado? |
|------|-------------|
| Cadastrar OAB | ✅ Sim |
| Sincronizar OAB (request_id busca) | ✅ Sim |
| Importar processo | ✅ Sim |
| Carregar Andamentos (detalhes_request_id) | ✅ Sim |
| Ativar monitoramento (tracking_id) | ✅ Sim |
| **Desativar monitoramento** | ❌ **Não** |

### O que precisa ser feito:
Quando o usuário desativa o monitoramento, registrar um novo evento no `tenant_banco_ids` com tipo `tracking_desativado` para manter histórico completo.

---

## Alterações Necessárias

### 1. Atualizar Trigger `registrar_banco_id_processo()`

Adicionar nova condição para capturar desativação de monitoramento:

```sql
-- UPDATE: registrar quando monitoramento foi DESATIVADO
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
    'Monitoramento Desativado: ' || COALESCE(NEW.numero_cnj, 'Processo'),
    jsonb_build_object(
      'numero_cnj', NEW.numero_cnj, 
      'tracking_id', NEW.tracking_id,
      'desativado_em', NOW()
    )
  );
END IF;
```

### 2. Atualizar Dialog para Exibir Histórico de Tracking

O `TenantBancoIdsDialog.tsx` precisa:
- Mostrar itens de tipo `tracking_desativado` na aba Tracking
- Diferenciar visualmente monitoramento ativo vs desativado
- Mostrar badge vermelho "🔴 Desativado" para trackings pausados

### 3. Migrar Dados Existentes (Opcional)

Para processos que já tiveram monitoramento desativado, podemos criar registros retroativos baseados no campo `monitoramento_ativo = false` e `tracking_id IS NOT NULL`.

---

## Detalhes Técnicos

### Migração SQL

```sql
-- 1. Atualizar função para incluir desativação
CREATE OR REPLACE FUNCTION public.registrar_banco_id_processo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- INSERT: registrar ID do processo
  IF TG_OP = 'INSERT' THEN
    INSERT INTO tenant_banco_ids (...)
    VALUES (...);
  END IF;
  
  -- UPDATE: registrar tracking_id se ativou monitoramento
  IF TG_OP = 'UPDATE' AND NEW.tracking_id IS DISTINCT FROM OLD.tracking_id AND NEW.tracking_id IS NOT NULL THEN
    INSERT INTO tenant_banco_ids (...)
    VALUES (...);
  END IF;
  
  -- NOVO: registrar quando monitoramento foi DESATIVADO
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
    INSERT INTO tenant_banco_ids (...)
    VALUES (...);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Migrar monitoramentos já desativados (retroativo)
INSERT INTO tenant_banco_ids (tenant_id, tipo, referencia_id, external_id, descricao, metadata, created_at)
SELECT 
  tenant_id,
  'tracking_desativado',
  id,
  tracking_id,
  'Desativado: ' || COALESCE(numero_cnj, 'Processo'),
  jsonb_build_object('numero_cnj', numero_cnj, 'tracking_id', tracking_id, 'retroativo', true),
  updated_at
FROM processos_oab 
WHERE tenant_id IS NOT NULL 
  AND tracking_id IS NOT NULL 
  AND monitoramento_ativo = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM tenant_banco_ids tbi 
    WHERE tbi.referencia_id = processos_oab.id 
      AND tbi.tipo = 'tracking_desativado'
  );
```

### Atualização do Dialog

Modificar `TenantBancoIdsDialog.tsx`:

```tsx
// Adicionar novo tipo
type TipoId = 'oab' | 'processo' | 'tracking' | 'tracking_desativado' | 'request_busca' | 'request_detalhes';

// Na aba Tracking, mostrar ambos tipos
{activeTab === 'tracking' && (
  [...bancoIds.filter(i => i.tipo === 'tracking' || i.tipo === 'tracking_desativado')]
)}

// Renderizar badge diferenciado
{item.tipo === 'tracking_desativado' && (
  <Badge variant="destructive" className="text-xs">
    🔴 Desativado
  </Badge>
)}
{item.tipo === 'tracking' && (item.metadata as any).monitoramento_ativo && (
  <Badge className="text-xs bg-green-500/20 text-green-600">
    🟢 Ativo
  </Badge>
)}
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Atualizar trigger + migrar dados retroativos |
| `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` | Exibir tracking_desativado na aba Tracking |

---

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Aba Tracking:                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ 📻 1052085-77.2023.8.26.0506                                        │
│    Tracking: 5f49c201-f043-4856-b5bd-8414bc51fedc            [📋]  │
│    🟢 Ativo                                                         │
│    Data: 15/12/2025 16:39                                           │
├─────────────────────────────────────────────────────────────────────┤
│ 📻 0000123-45.2024.8.16.0001                                        │
│    Tracking: abc12345-xxxx-yyyy-zzzz-123456789012            [📋]  │
│    🔴 Desativado                                                    │
│    Data: 20/01/2026 10:15                                           │
└─────────────────────────────────────────────────────────────────────┘
```

O histórico completo de monitoramentos (ativos e desativados) ficará visível, permitindo auditoria de quando cada processo teve monitoramento ligado/desligado.
