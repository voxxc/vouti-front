## Causa raiz

No painel da controladoria do tenant (`src/components/Controladoria/ProcessoOABDetalhes.tsx`), cada card de andamento renderiza uma badge "Manual" quando `dados_completos.origem === 'manual'`. Essa informação é interna (criação manual via super-admin) e não tem valor para o usuário final.

## Correção

Remover apenas no painel do tenant a renderização da badge "Manual" e a variável `isManual` que a controla. Manter o badge no painel do super-admin (`SuperAdminProcessoOABDetalhesPanel.tsx`), onde a distinção é útil.

## Arquivos afetados

- `src/components/Controladoria/ProcessoOABDetalhes.tsx` — remover a badge `Manual` e a derivação `isManual` no `andamentos.map`. Demais badges (tipo, anexos, sigiloso, tribunal) permanecem intactas.

## Impacto

1. **UX (usuário final do tenant)**: cards de andamento ficam mais limpos; o usuário não vê mais a marcação "Manual". Anexos manuais (quando existem) continuam visíveis via o botão de download.
2. **Dados**: nenhuma mudança no banco, sem migration, sem RLS, sem performance.
3. **Riscos colaterais**: nenhum — apenas remoção visual condicional. Super-admin continua vendo o badge no seu próprio painel.
4. **Quem é afetado**: todos os usuários do tenant que abrem o detalhe de um processo OAB na controladoria. Super-admin não é afetado.

## Validação

- Abrir um processo na controladoria com andamento criado manualmente pelo super-admin → o card não exibe mais "Manual" (mas mantém data, tipo, sigiloso, tribunal e anexos).
- Abrir o mesmo processo no painel do super-admin → badge "Manual" segue presente.
