## Causa raiz
No `ProcessoApartadoBranch.tsx`, as linhas filhas exibem o rótulo fixo `"Apartado"` seguido do sufixo (`/1.0000.24.414460-6/006`). O usuário não quer o rótulo textual — quer apenas o trecho do apartado, com uma marcação visual (badge) indicando que é apartado.

## Correção
Em `src/components/Controladoria/ProcessoApartadoBranch.tsx`:
- Remover o texto `"Apartado"` como label principal das linhas filhas.
- Exibir apenas o sufixo do apartado (ex.: `1.0000.24.414460-6/006`, sem a `/` inicial) como conteúdo da linha, em fonte mono.
- Adicionar um `<Badge variant="outline">apartado</Badge>` ao lado para marcar visualmente.
- Fallback: se não houver sufixo extraível, mostrar o `numero_cnj` cru.

Nenhuma outra lógica (busca, navegação, raiz/original) é alterada.

## Arquivos afetados
- `src/components/Controladoria/ProcessoApartadoBranch.tsx`

## Impacto
1. **UX**: o branch passa a mostrar `└─ 1.0000.24.414460-6/006  [apartado]` em vez de `└─ Apartado /1.0000.24.414460-6/006`. Mais limpo e direto.
2. **Dados**: sem mudanças (sem migration, sem RLS).
3. **Riscos colaterais**: nenhum — apenas renderização do componente. Clique/navegação entre processos seguem iguais.
4. **Afetados**: todos os tenants que abrem o resumo de processos OAB com apartados (Controladoria).

## Validação
- Abrir um processo com apartado (ex.: `0017243-05.2025.8.16.0019` ou o `4092349-43.2025.8.13.0000/1.0000.24.414460-6/006`) e confirmar que o branch mostra somente o trecho do apartado + badge `apartado`.
- Confirmar que o clique no apartado ainda navega entre os processos.
