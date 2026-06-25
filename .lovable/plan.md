## Causa raiz
Em `src/components/Controladoria/ProcessoOABDetalhes.tsx`, o card `ProcessoApartadoBranch` ("Estrutura do processo") está renderizado entre o alerta de **Processo Sigiloso** (linhas ~768) e o alerta de **Processo Apartado** (linhas ~804), o que quebra a leitura visual.

## Correção
Mover o bloco `ProcessoApartadoBranch` (linhas ~792–802) para logo **abaixo** do alerta de Processo Apartado (depois da linha ~824), mantendo a ordem:

1. Alerta de Processo Sigiloso
2. Alerta de Processo Apartado
3. Card "Estrutura do processo" (branch)
4. Alerta de Em Processamento, monitoramento, etc.

Nenhuma alteração de lógica, props ou estilo do componente — apenas reordenação JSX.

## Arquivos afetados
- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — reordenar dois blocos JSX dentro da aba Resumo.

## Impacto
1. **Usuário final:** em processos apartados, o aviso explicativo aparece imediatamente após o alerta de sigilo (quando houver), e o quadro de estrutura aparece logo depois, formando um agrupamento coerente. Em processos não-apartados sem irmãos, o branch continua oculto (já é o comportamento atual).
2. **Dados:** nenhum. Sem migrations, sem RLS, sem queries novas.
3. **Riscos colaterais:** mínimos — é uma movimentação de JSX dentro do mesmo container; sem mudança em hooks, estado ou props.
4. **Quem é afetado:** apenas usuários da Controladoria que abrem o detalhe de um processo OAB. Sem efeito em outros tenants/roles.

## Validação
- Abrir um processo apartado: confirmar que "Estrutura do processo" aparece abaixo do alerta amarelo de apartado.
- Abrir um processo sigiloso não apartado: confirmar que o branch não aparece (sem irmãos) e o layout segue normal.
- Abrir um processo normal com apartados cadastrados: confirmar que a estrutura aparece na nova posição.
