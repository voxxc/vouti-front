

## Deletar a publicacao falsa do Alan

### O que sera feito

Remover o registro com dados inventados da tabela `publicacoes` (ID: `10f657b2-f95e-45eb-b8b8-1e78a85d384d`).

Este registro contem dados completamente fabricados (processo `0004010-95.2026.8.16.0021` com data de 2026, juiz inexistente, conteudo inventado).

### Detalhes tecnicos

Executar um DELETE na tabela `publicacoes` para o registro especifico:

```text
DELETE FROM publicacoes WHERE id = '10f657b2-f95e-45eb-b8b8-1e78a85d384d'
```

### Resultado esperado

- A publicacao falsa sera removida do drawer de Publicacoes
- Quando processos reais forem cadastrados na tabela `processos_oab` do tenant `/demorais`, o monitoramento automatico via DataJud ira buscar e inserir dados verdadeiros

### Nenhum arquivo de codigo sera alterado

Apenas uma operacao de dados no banco.

