## Causa raiz

No `SuperAdminMovimentosManuaisDrawer`, o callback `onAndamentoCriado` está apontado para `recarregar()`, que incrementa `reloadKey` e dispara o `useEffect` de fetch. Esse efeito faz `setLoading(true)` + `setProcessos([])`, então a tabela "pisca" para o estado vazio + skeleton e só depois reaparece sem o caso atualizado. O usuário percebe um reload completo da aba "total" (ou "atualizado") toda vez que salva movimentos ou clica em "Marcar como atualizado".

A mesma coisa acontece ao excluir um andamento ou após salvar movimentos manuais via `AdicionarMovimentoManualDialog` (que também chama `onSuccess` → `recarregar`).

## Correção

Trocar o reload por uma **mutação otimista local** no drawer:

1. **Novo callback `onProcessoMutado(processoId, acao)`** em `SuperAdminMovimentosManuaisDrawer`, onde `acao` é `'atualizado' | 'revertido' | 'refresh'`.
   - `'atualizado'`: na aba `'total'`, remove o processo da lista local (`setProcessos(prev => prev.filter(p => p.id !== id))`). Na aba `'atualizado'`, atualiza `super_admin_atualizado_em` para `new Date().toISOString()` (movendo para o topo / renovando o "expira em").
   - `'revertido'` (futuro, se houver botão de reverter): inverso.
   - `'refresh'`: fallback que dispara o `recarregar()` antigo, usado só para casos que realmente precisam (ex: criação de novos processos vindos de fora).
2. **`SuperAdminProcessoOABDetalhesPanel`**: trocar `onAndamentoCriado?: () => void` por `onProcessoMutado?: (id: string, acao: 'atualizado' | 'refresh') => void`. Chamar `onProcessoMutado?.(processo.id, 'atualizado')` em:
   - `marcarComoAtualizado` (após sucesso)
   - `onSuccess` do `AdicionarMovimentoManualDialog` (salvar movimentos automaticamente marca como atualizado no backend)
   - `excluirAndamento`: manter o `onAndamentoCriado` antigo como `'refresh'` apenas se a exclusão puder mudar o status; caso contrário, apenas atualizar `andamentos` local (já faz isso) e não notificar o drawer.
3. **Manter botão "Recarregar"** do drawer funcionando como hoje (refetch completo manual).

Nenhuma chamada de rede é alterada — só remove o refetch automático após cada ação.

## Arquivos afetados

- `src/components/SuperAdmin/SuperAdminMovimentosManuaisDrawer.tsx` — adicionar handler `handleProcessoMutado`, passá-lo ao painel no lugar de `recarregar`.
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx` — renomear prop `onAndamentoCriado` → `onProcessoMutado` (com fallback compatível) e chamar com `(processo.id, 'atualizado')` nos pontos certos.

## Impacto

- **Usuário final (UX)**: ao salvar movimentos ou clicar "Marcar como atualizado", o caso some imediatamente da aba "total" (ou aparece atualizado na aba "atualizado") sem skeleton/reload. Sensação de instantaneidade alinhada com a otimização do salvamento em segundo plano feita anteriormente.
- **Dados**: nenhuma mudança — backend continua chamando `super-admin-marcar-atualizado` e `super-admin-criar-andamento-manual` exatamente como antes. Sem migrations, sem RLS, sem novos índices.
- **Riscos colaterais**:
  - Se o backend falhar silenciosamente após a remoção local, o caso some da UI mas continua "não atualizado" no DB. Mitigação: mutação otimista só acontece após `await` retornar sem erro.
  - Contadores agregados (badge da aba "atualizado", se houver) podem ficar levemente fora de sincronia até o próximo reload manual. Aceitável.
- **Quem é afetado**: apenas super-admins usando o drawer de movimentos manuais. Nenhum outro tenant/usuário é tocado.

## Validação

1. Abrir drawer em qualquer tenant na aba "total", abrir um processo, salvar movimento — confirmar que o caso some da lista sem skeleton.
2. Trocar para aba "atualizado" — confirmar que ele aparece no topo com "expira em 7d".
3. Clicar "Marcar como atualizado" diretamente sem adicionar movimentos — mesma verificação.
4. Clicar botão "Recarregar" — confirmar que o fetch completo ainda funciona.
5. Excluir um andamento — confirmar que não recarrega a aba inteira.
