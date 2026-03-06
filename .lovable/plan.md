

## Diagnóstico: Busca Geral retornando apenas processos

### Problema identificado
A edge function `judit-buscar-dados-cadastrais` **não envia** o parâmetro `response_type` na requisição à Judit. De acordo com a documentação da API:

- **Sem `response_type`** → padrão é `lawsuit` (retorna processos judiciais)
- **Com `response_type: "entity"`** → retorna dados cadastrais (nome, nome da mãe, telefone, endereços, contatos)

O código tem um comentário dizendo que "a API Judit rejeita response_type neste endpoint", mas a documentação de consumo confirma que `entity` é um valor válido para dados cadastrais.

### Solução
Adicionar `response_type: "entity"` ao payload enviado para a API Judit na edge function `judit-buscar-dados-cadastrais`.

### Alterações

**`supabase/functions/judit-buscar-dados-cadastrais/index.ts`**

1. No payload principal (linha ~149-154): adicionar `response_type: "entity"` ao objeto `search`
2. Na função `fetchEntityDetails` (linha ~32-38): adicionar `response_type: "entity"` ao payload de enriquecimento
3. Remover o comentário que diz que a API rejeita `response_type`

Isso fará a API retornar os dados cadastrais completos (nome da mãe, telefone, endereço, etc.) em vez de apenas listar processos.

