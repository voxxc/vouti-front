## Causa raiz
No `AndamentoCard` (lista de andamentos do drawer do processo), existem apenas dois botões na barra de ações: editar metadados (lápis) e excluir (lixeira). Não há forma de reverter o estado `lida=true` de um andamento — uma vez que o usuário abriu o processo (e o andamento foi marcado como lido), não consegue voltar para "Não lida".

## Correção
Adicionar um botão na barra de ações de cada `AndamentoCard` que alterna o flag `lida`:

- Quando `a.lida === true` → mostrar ícone `EyeOff` (Marcar como não lido)
- Quando `a.lida === false` → mostrar ícone `Eye` (Marcar como lido)
- Ao clicar: `UPDATE processos_oab_andamentos SET lida = !lida WHERE id = a.id`
- Atualizar estado local otimista (mesmo padrão do `onAtualizar` já existente) para refletir imediatamente o badge "Não lida" no card
- Posicionar o botão à esquerda do lápis, para ficar visível mesmo quando o popover de edição está fechado

Implementação no componente pai `SuperAdminProcessoOABDetalhesPanel`:
- Nova prop/handler `onToggleLida(andamentoId, novaLida)` passada ao `AndamentoCard`
- Função `toggleLida` faz update no Supabase e atualiza `andamentos` em memória
- Disparar `onAndamentoCriado?.()` (mesmo callback já usado) se for útil para a fila no drawer pai recalcular contadores; caso contrário, basta o setState local

## Arquivos afetados
- `src/components/SuperAdmin/SuperAdminProcessoOABDetalhesPanel.tsx`
  - Adicionar import `Eye` do lucide-react
  - Criar função `toggleLida(id: string, lida: boolean)`
  - Passar nova prop ao `AndamentoCard`
  - Adicionar botão dentro do `AndamentoCard` (antes do botão Pencil)

Nenhuma migration, nenhuma edge function nova — o campo `lida` já existe e RLS já permite update (vide `useAndamentosNaoLidosGlobal.marcarTodosComoLidos`).

## Impacto
1. **Usuário final (UX):** Cada andamento na lista do drawer do processo ganha um ícone de olho. Clicando, alterna entre "lido" e "não lido". O badge "Não lida" aparece/desaparece em tempo real. Permite reverter leitura acidental ou re-sinalizar um andamento que precisa de nova atenção.
2. **Dados:** Apenas updates no campo `lida` da tabela `processos_oab_andamentos` (já existente). Sem migration, sem mudança de RLS, sem impacto em performance (1 row por clique).
3. **Riscos colaterais:** O contador global de andamentos não lidos (`useAndamentosNaoLidosGlobal`) já escuta o realtime dessa tabela, então o badge global se ajusta automaticamente. Se o usuário marcar de volta como não lido um processo que saiu da fila de "atualizar", ele reaparecerá na fila — comportamento esperado.
4. **Quem é afetado:** Apenas super admins (componente está sob `SuperAdmin/`).

## Validação
- Abrir um processo no drawer, clicar no novo ícone de olho em um andamento lido → badge "Não lida" aparece e contador global incrementa.
- Clicar novamente → badge some e contador decrementa.
- Recarregar o drawer → estado persiste corretamente.
