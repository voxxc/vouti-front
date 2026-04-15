

## Plano: Corrigir vínculo e system_name do PROJUDI TJPR (SOLVENZA)

### Problema
- `credenciais_cliente` id `7433c021` tem o secret válido (`JMZT KNLC...`) mas `system_name = NULL` — aparece sem nome de tribunal
- `credenciais_judit` id `5d8c5cd6` (PROJUDI TJPR - 1º grau, customer_key `111056/PR`) tem `credencial_cliente_id = NULL` — sem vínculo com o registro acima

### Correção (data fix via insert tool)

1. **Atualizar `credenciais_cliente`**: definir `system_name = 'PROJUDI TJPR - 1º grau'` no registro `7433c021`
2. **Atualizar `credenciais_judit`**: definir `credencial_cliente_id = '7433c021-9226-429c-9e45-145ec11b4f90'` no registro `5d8c5cd6`

### Resultado
- O registro aparecerá com o badge "PROJUDI TJPR - 1º grau" na aba Recebidas
- O Histórico mostrará o vínculo correto entre a credencial Judit e a credencial cliente

### Arquivos
Nenhum arquivo de código precisa ser alterado — apenas 2 UPDATEs no banco de dados.

