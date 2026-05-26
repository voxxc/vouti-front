# Inserir credencial global `alangeral` (*)

## Causa raiz
A credencial `alangeral` foi cadastrada diretamente na Judit via Postman, mas não existe na tabela `public.credenciais_judit` do Vouti. Por isso ela não aparece no dropdown de edição (que é alimentado pela função `list_judit_credentials` filtrando por `tenant_id`).

Segundo a doc da Judit, `system_name = '*'` representa credencial global (válida para qualquer tribunal).

## Correção
Inserir 1 linha em `public.credenciais_judit` para o tenant Solvenza (`27492091-e05d-46a8-9ee8-b3b47ec894e4`):

| campo | valor |
|---|---|
| `customer_key` | `alangeral` |
| `system_name` | `*` |
| `username` | `alangeral` (mesmo padrão das outras globais) |
| `status` | `active` |
| `oab_id` / `credencial_cliente_id` / `enviado_por` | `NULL` |

Como o `SelectItem` mostra `system_name — customer_key`, no dropdown aparecerá: **`* — alangeral`**.

## Arquivos afetados
- Nenhum arquivo de código alterado.
- 1 INSERT em `public.credenciais_judit` (via tool de insert).

## Impacto
1. **UX:** Daniel passa a ver a opção `* — alangeral` no dropdown "Credencial Judit" da edição do caso na tela `/solvenza` (Controladoria → ProcessoOABDetalhes). Como é global, pode ser selecionada para qualquer tribunal.
2. **Dados:** +1 linha em `credenciais_judit`. Sem migration, sem mudança de schema, sem alteração de RLS. Performance inalterada.
3. **Riscos colaterais:** Mínimos. Caso alguma rotina antiga ainda assuma `system_name` específico (não global), pode tentar usar `alangeral` em tribunal não suportado pela Judit — mas isso é controlado pela própria Judit no momento da chamada. Sem efeito em monitoramento já existente.
4. **Quem é afetado:** Apenas o tenant Solvenza, e dentro dele apenas Daniel (único com acesso ao dropdown, conforme `list_judit_credentials`). Demais tenants e usuários não veem nem são impactados.

## Validação
- Após o INSERT, abrir a edição de um caso em Solvenza, abrir o dropdown e confirmar que `* — alangeral` aparece junto com as demais.
- Selecionar `alangeral`, salvar e verificar toast "Credencial atualizada para * — alangeral".
