

# Corrigir tribunal "Desconhecido" nos Indicadores

## Problema
O componente busca apenas `tribunal_sigla` da tabela, que está NULL para muitos processos. Resultado: tudo aparece como "Desconhecido".

## Solução
Buscar também `numero_cnj` e usar a função `extrairTribunalDoNumeroProcesso` (já existente em `src/utils/processoHelpers.ts`) como fallback quando `tribunal_sigla` estiver vazio. Essa função extrai o tribunal correto a partir do número CNJ (ex: `8.16` = TJPR).

## Alteração

**`src/components/Controladoria/ControladoriaIndicadores.tsx`**:
- Importar `extrairTribunalDoNumeroProcesso`
- Alterar query para buscar `tribunal_sigla, numero_cnj`
- No agrupamento, usar: `p.tribunal_sigla || extrairTribunalDoNumeroProcesso(p.numero_cnj) || "Desconhecido"`

