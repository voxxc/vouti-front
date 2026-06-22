## Causa raiz

Em `SuperAdminProcessoOABDetalhesPanel.marcarComoAtualizado`, o `onProcessoMutado(..., 'atualizado')` só é chamado APÓS o `await supabase.functions.invoke('super-admin-marcar-atualizado', ...)` retornar. Como essa edge function leva alguns segundos, o auto-advance da fila (que troca para o próximo processo) também espera tudo isso. Resultado: o usuário clica "Marcar como atualizado" e ainda enxerga o processo atual congelado até a rede responder.

O mesmo padrão acontece em `AdicionarMovimentoManualDialog.onSuccess` (já roda depois do save, então ali está OK — o save precisa terminar antes de marcar como atualizado).

## Correção

Tornar a ação "Marcar como atualizado" **otimista**:

1. Avançar a fila IMEDIATAMENTE ao clique — chamar `onProcessoMutado(processo.id, 'atualizado')` antes do `await`.
2. Disparar `supabase.functions.invoke('super-admin-marcar-atualizado', ...)` em segundo plano (fire-and-forget com `.then/.catch`).
3. Em caso de erro do servidor: mostrar `toast.error` informando que precisa reabrir o processo e tentar de novo (não há como "desfazer" o avanço sem piorar a UX — o usuário já está em outro processo).
4. Remover o estado `marcandoAtualizado`/loader do botão (não faz mais sentido, já que avançamos na hora) — ou mantê-lo só visualmente por ~200ms apenas como feedback de clique.

Como o painel é remontado via `key={selecionado.id}` no drawer, o próximo processo já abre limpo com seu próprio fetch — comportamento atual preservado.

## Arquivos afetados

- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx` — tornar `marcarComoAtualizado` otimista (fire-and-forget).

## Impacto

- **Usuário final (UX)**: ao clicar "Marcar como atualizado", o próximo processo da fila abre INSTANTANEAMENTE, sem esperar a edge function. A confirmação/atualização do banco roda em segundo plano. Bem mais fluido para revisar muitos processos em sequência.
- **Dados**: zero mudança — mesma edge function, mesmas chamadas. Só muda a ordem do `await`.
- **Riscos colaterais**: 
  - Se a edge function falhar, o processo permanece "não atualizado" no banco mesmo tendo sumido da aba Total no estado local. Mitigação: toast de erro claro + ao reabrir o drawer (`reloadKey`/refetch), o processo reaparece na aba Total naturalmente, então o usuário pode tentar de novo.
  - Sem regressão para `onAndamentoCriado` (continua sendo chamado em seguida).
- **Quem é afetado**: super-admins usando o drawer de movimentos manuais.

## Validação

1. Abrir drawer → aba Total → abrir um processo.
2. Clicar "Marcar como atualizado" → o próximo processo deve abrir IMEDIATAMENTE (sem spinner perceptível, sem espera).
3. Repetir várias vezes seguidas rapidamente — fila avança fluido.
4. Simular erro (ex.: desconectar rede momentaneamente): confirmar toast de erro e que o processo reaparece em Total após reabrir o drawer.
5. Aba Atualizado: ação não auto-avança (comportamento atual) — verificar que só atualiza o badge.
