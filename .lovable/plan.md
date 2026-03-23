

# Fix: Processo apartado sendo detectado como duplicado

## Problema
A verificação de duplicidade (linha 41-50 da edge function) compara apenas o `numero_cnj` base, sem considerar o sufixo do apartado. Assim, ao tentar importar `0000000-00.0000.0.00.0000/50000`, o sistema encontra o processo base `0000000-00.0000.0.00.0000` e bloqueia como duplicado.

## Solução

### `supabase/functions/judit-buscar-processo-cnj/index.ts`

- Na verificação de duplicidade (linha 41-46), quando `apartado === true`, usar o CNJ com sufixo na comparação
- Ao salvar o processo no banco, armazenar o `numero_cnj` com sufixo (ex: `0000000-00.0000.0.00.0000/50000`) para que fique diferenciado do processo base
- Construir: `const cnjParaSalvar = apartado && sufixoApartado ? numeroCnj + sufixoApartado : numeroCnj`
- Usar `cnjParaSalvar` tanto na verificação de duplicidade quanto no INSERT do processo

Isso garante que o processo base e o apartado coexistam no banco com CNJs distintos.

