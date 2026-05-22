# Corrigir "duplo ESC" fechando o drawer do projeto

## Causa raiz

O handler de ESC em `ProjectProtocolosList.tsx` usa o seletor:

```text
[role="dialog"][data-state="open"]:not([data-radix-sheet-content]), [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]
```

para detectar "qualquer overlay aberto" e abortar. O problema: o próprio `SheetContent` do `ProjectDrawer` tem `role="dialog"` e `data-state="open"`, e NÃO emite `data-radix-sheet-content` (Radix Sheet é construído sobre Dialog e não adiciona esse atributo). O seletor casa com o próprio drawer, `hasOverlay` é sempre verdadeiro, o handler retorna cedo, e o `DismissableLayer` do Radix fecha o Sheet no primeiro ESC. O usuário percebe como "um duplo ESC que eu não dei".

## Correção

Trocar a heurística de "existe algum overlay" para **contagem de diálogos abertos**:

- Contar elementos `[role="dialog"][data-state="open"]` + `[role="alertdialog"][data-state="open"]`.
- Se `> 1`, há modal interno empilhado sobre o Sheet → `return` e deixar o Radix fechar o modal interno.
- Se houver popover/dropdown aberto (`[data-radix-popper-content-wrapper]`), também `return`.
- Caso contrário (apenas o Sheet aberto), `preventDefault` + `stopImmediatePropagation` em capture e voltar para a lista.

## Arquivos afetados

- `src/components/Project/ProjectProtocolosList.tsx` — ajustar o `useEffect` do listener de ESC (linhas 87-103).

## Impacto

1. **UX:** Abrir projeto → abrir protocolo → ESC volta para a lista mantendo o drawer aberto. Segundo ESC fecha o drawer. Modais internos (etapa, editar, confirmar exclusão) continuam fechando primeiro com ESC.
2. **Dados:** Nenhuma mudança — alteração puramente de UI no client.
3. **Riscos colaterais:** Baixo, mudança local ao `ProjectProtocolosList`. Popovers/Dropdowns continuam fechando primeiro.
4. **Quem é afetado:** Todos os usuários que abrem protocolos dentro do drawer de projetos, em todos os tenants.

## Validação

- Projeto + protocolo aberto → ESC volta para lista (drawer permanece).
- Segundo ESC → fecha o drawer do projeto.
- Modal de etapa aberto → ESC fecha apenas o modal.
- Dropdown "Mover para carteira" aberto → ESC fecha apenas o dropdown.
## Impacto
1. **Usuário final (UX):** ESC vira uma navegação hierárquica natural dentro do drawer de Projetos — primeiro fecha o protocolo, depois o drawer. Reduz o atrito de reabrir o projeto após uma consulta rápida ao protocolo.
2. **Dados:** nenhuma mudança. Sem migrations, sem RLS, sem performance afetada.
3. **Riscos colaterais:** o listener em fase de captura precisa ser bem escopado (apenas quando `view === 'detalhes'`) para não bloquear ESC de outros diálogos eventualmente abertos por cima (modais de edição). Será adicionado/removido via `useEffect` controlado por `view`.
4. **Quem é afetado:** todos os tenants e perfis que abrem projetos pelo drawer (busca rápida, agenda, dashboard).

## Validação
- Abrir um projeto, abrir um protocolo → ESC volta para a lista, drawer continua aberto.
- ESC novamente → drawer do projeto fecha.
- Abrir um modal de edição dentro do protocolo → ESC fecha apenas o modal, sem voltar a lista (Radix Dialog interno tem prioridade).
