# Corrigir timeout no teste de publicação via CNJ

## Causa raiz
O job falhou com `"Timeout aguardando resposta Judit"`. Dois fatores combinados:

1. **Janela de polling curta:** 30 tentativas × 3s = 90s. Busca `on_demand` com `with_attachments: true` no TJTO leva mais que isso.
2. **Critério de "pronto" frágil:** o código aceita apenas `status === 'completed' | 'done'`. No `/responses` da Judit, o item normalmente já vem com `response_data` preenchido sem esse campo (ou com outro valor como `created`), então o loop não reconhece a conclusão e estoura o tempo.

## Correção
Em `supabase/functions/judit-test-publicacao-cnj/index.ts`, no bloco `processarJob`:

- Aumentar polling para ~5 min (60 × 5s).
- Considerar pronto quando houver `response_data` com `steps` ou `code` preenchidos (não depender só do campo `status`).
- Logar o shape do primeiro retorno para diagnóstico em logs.
- Em caso de timeout, gravar no `error_message` o último status visto para facilitar debug.

## Arquivos afetados
- `supabase/functions/judit-test-publicacao-cnj/index.ts`

## Impacto
- **Usuário (Super-Admin):** o card passa a aguardar até 5 min, refletindo o tempo real da Judit em CNJs com anexos. Erros ficam mais informativos.
- **Dados:** nenhuma mudança de schema. Apenas mais jobs em `publicacao_test_jobs` chegarão a `completed`.
- **Riscos colaterais:** baixos. `EdgeRuntime.waitUntil` suporta 5 min sem problemas; o POST inicial continua respondendo em ~1s (202).
- **Quem é afetado:** somente Super-Admins na aba Ferramentas. Restrito ao tenant Demorais.

## Validação
1. Reexecutar com `0000927-04.2025.8.27.2704`.
2. Logs devem mostrar o shape do response e finalizar com `completed`.
3. Card deve aparecer como "Concluído" com botão "Abrir PDF".
