# Corrigir erro ao gerar publicação de teste

## Causa raiz
A Edge Function `judit-test-publicacao-cnj` foi criada como arquivo no repositório, mas nunca foi efetivamente deployada. Ao clicar em "Gerar publicação de teste", o cliente recebe **404 NOT_FOUND** porque o endpoint não existe no Supabase. Por isso também não há nenhum registro em `publicacao_test_jobs` nem logs da função.

## Correção
1. Deployar manualmente a função `judit-test-publicacao-cnj` via ferramenta de deploy.
2. Disparar uma chamada de teste com o CNJ `0000927-04.2025.8.27.2704` para validar que ela responde 202 e cria o job.
3. Acompanhar logs da função para garantir que o processamento em background completa (request Judit → download → upload → insert em `publicacoes`).

## Arquivos afetados
Nenhum arquivo de código. Apenas operação de deploy + validação.

## Impacto
- **Usuário final (Super-Admin):** o botão "Gerar publicação de teste" passa a funcionar; o card aparece no histórico e atualiza em tempo real via Realtime.
- **Dados:** começarão a ser criados registros em `publicacao_test_jobs` e, quando bem-sucedidos, em `publicacoes` do tenant Demorais (com flag `metadata.teste=true`).
- **Riscos colaterais:** baixo. A função roda apenas para Super-Admins e insere exclusivamente no tenant Demorais.
- **Quem é afetado:** apenas Super-Admins usando a aba "Ferramentas".

## Validação
- `curl` na função deve retornar `202` com `jobId`.
- Logs devem mostrar `processarJob` finalizando com `completed`.
- UI deve exibir card com status atualizando de `pending` → `processing` → `completed`.
