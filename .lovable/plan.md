
# Corrigir Erro ao Desativar Monitoramento de Processo OAB

## Problema Identificado

Ao tentar desativar o monitoramento de um processo OAB no tenant "cordeiro", o sistema falha com o seguinte erro nos logs da edge function:

```
ERROR [Judit Monitor] Erro ao atualizar processos: {
  code: "23514",
  message: 'new row for relation "tenant_banco_ids" violates check constraint "tenant_banco_ids_tipo_check"'
}
```

## Causa Raiz

Existe um **trigger** chamado `registrar_banco_id_processo` na tabela `processos_oab` que registra eventos no "Banco de IDs" (tabela `tenant_banco_ids`). Quando o monitoramento e desativado, o trigger tenta inserir um registro com `tipo = 'tracking_desativado'`.

Porem, o **check constraint** `tenant_banco_ids_tipo_check` nao inclui esse valor na lista de tipos permitidos:

**Atual (incorreto):**
```sql
CHECK (tipo = ANY (ARRAY[
  'oab', 'processo', 'tracking', 
  'request_busca', 'request_detalhes', 'request_monitoramento'
]))
```

**Faltando:** `'tracking_desativado'`

## Solucao

Atualizar o check constraint para incluir o tipo `tracking_desativado`.

---

## Alteracoes Tecnicas

### Migracao SQL

Executar a seguinte migracao para atualizar o check constraint:

```sql
-- Remover constraint atual
ALTER TABLE tenant_banco_ids 
DROP CONSTRAINT IF EXISTS tenant_banco_ids_tipo_check;

-- Adicionar constraint atualizada com tracking_desativado
ALTER TABLE tenant_banco_ids 
ADD CONSTRAINT tenant_banco_ids_tipo_check 
CHECK (tipo = ANY (ARRAY[
  'oab'::text, 
  'processo'::text, 
  'tracking'::text, 
  'tracking_desativado'::text,
  'request_busca'::text, 
  'request_detalhes'::text, 
  'request_monitoramento'::text
]));
```

---

## Fluxo Atual (Com Erro)

```text
Usuario clica em Desativar Monitoramento
              |
              v
Edge Function judit-ativar-monitoramento-oab
  (ativar=false)
              |
              v
UPDATE processos_oab SET monitoramento_ativo=false
              |
              v
Trigger registrar_banco_id_processo dispara
              |
              v
INSERT INTO tenant_banco_ids (tipo='tracking_desativado')
              |
              v
[X] ERRO: Check constraint violado!
```

## Fluxo Apos Correcao

```text
Usuario clica em Desativar Monitoramento
              |
              v
Edge Function judit-ativar-monitoramento-oab
  (ativar=false)
              |
              v
UPDATE processos_oab SET monitoramento_ativo=false
              |
              v
Trigger registrar_banco_id_processo dispara
              |
              v
INSERT INTO tenant_banco_ids (tipo='tracking_desativado')
              |
              v
[OK] Registro criado com sucesso!
              |
              v
Monitoramento desativado, historico mantido
```

---

## Resultado Esperado

1. O usuario podera desativar o monitoramento de processos OAB normalmente
2. O evento de desativacao sera registrado no "Banco de IDs" para auditoria
3. O historico de andamentos sera mantido conforme esperado
