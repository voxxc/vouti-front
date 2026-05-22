# ESC volta para tela anterior dentro do drawer de Projetos

## Causa raiz
Ao pressionar **ESC** dentro do drawer de Projetos, o Radix Sheet captura o evento e fecha o drawer inteiro de uma vez, mesmo quando há uma "tela filha" aberta (protocolo/processo em detalhes). Hoje o usuário perde todo o contexto do projeto.

## Comportamento desejado
- Drawer do projeto aberto + protocolo/processo aberto → **ESC** volta para a lista de protocolos (mantém o drawer do projeto aberto).
- Drawer do projeto aberto na lista → **ESC** fecha o drawer.
- Mesma lógica do que já foi feito em Publicações.

## Correção
1. **`ProjectProtocolosList.tsx`** — quando `view === 'detalhes'`, registrar listener de `keydown` em fase de captura no `document`. Se a tecla for `Escape`:
   - `event.preventDefault()` + `event.stopImmediatePropagation()` para impedir o Radix de fechar o Sheet.
   - `setView('lista')` e `setSelectedProtocoloId(null)`.
2. **`ProjectDrawer.tsx`** — sem mudanças. O `onOpenChange` padrão continua respondendo ao ESC quando estamos na lista (pois o listener acima só age quando `view === 'detalhes'`).
3. Verificar se existe outra "tela filha" análoga (ex.: processo CNJ aberto via vínculo). Hoje só foi encontrada a view de detalhes do protocolo dentro de `ProjectProtocolosList`; aplicar o mesmo padrão se aparecer uma nova subview no futuro.

## Arquivos afetados
- `src/components/Project/ProjectProtocolosList.tsx` (adicionar `useEffect` de ESC).

## Impacto
1. **Usuário final (UX):** ESC vira uma navegação hierárquica natural dentro do drawer de Projetos — primeiro fecha o protocolo, depois o drawer. Reduz o atrito de reabrir o projeto após uma consulta rápida ao protocolo.
2. **Dados:** nenhuma mudança. Sem migrations, sem RLS, sem performance afetada.
3. **Riscos colaterais:** o listener em fase de captura precisa ser bem escopado (apenas quando `view === 'detalhes'`) para não bloquear ESC de outros diálogos eventualmente abertos por cima (modais de edição). Será adicionado/removido via `useEffect` controlado por `view`.
4. **Quem é afetado:** todos os tenants e perfis que abrem projetos pelo drawer (busca rápida, agenda, dashboard).

## Validação
- Abrir um projeto, abrir um protocolo → ESC volta para a lista, drawer continua aberto.
- ESC novamente → drawer do projeto fecha.
- Abrir um modal de edição dentro do protocolo → ESC fecha apenas o modal, sem voltar a lista (Radix Dialog interno tem prioridade).
