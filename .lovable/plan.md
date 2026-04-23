

## Atualização imperceptível da view "Prazos" do Planejador ao concluir um prazo

### Causa raiz

O hook `useAgendaData` (usado por `PlanejadorPrazosView`) faz o `fetch` dos prazos **uma única vez**, no `useEffect([user])`. Não há:
- nenhuma subscription Realtime na tabela `deadlines`,
- nenhum listener de `CustomEvent` (tipo `deadline-completion-changed`),
- nenhum mecanismo de invalidação quando o `DeadlineDetailDialog` fecha após uma conclusão.

Resultado: você conclui o prazo pelo dialog (que é aberto a partir do Planejador → `setDeadlineDetailOpen(true)`), o backend grava `completed=true`, o `AgendaContent` atualiza seu próprio state local — mas o `deadlines` do `useAgendaData` continua intacto. O card permanece visualmente na coluna antiga ("Hoje", "Vencido", etc.) até você dar refresh ou reabrir o Planejador.

Outros componentes que disparam conclusão (`AgendaContent.handleConfirmComplete`, `DeadlineDetailDialog.handleConfirmComplete`, `ProjectProtocoloContent`) também não notificam ninguém — só atualizam state local próprio.

### Correção

**1. Criar um canal de eventos global para mudanças em prazos** (`window.dispatchEvent`):

Em todos os pontos onde `deadlines` é atualizada no banco (conclusão, reabertura, exclusão), disparar:
```ts
window.dispatchEvent(new CustomEvent('deadline-completion-changed', {
  detail: { deadlineId, completed: true | false }
}));
```

Pontos de disparo:
- `src/components/Agenda/DeadlineDetailDialog.tsx` → `handleConfirmComplete`, `handleReopenDeadline`.
- `src/components/Agenda/AgendaContent.tsx` → `handleToggleComplete`, `handleConfirmComplete`, `handleDeleteDeadline`.
- `src/components/Project/ProjectProtocoloContent.tsx` → onde marca `completed: true`.

**2. Tornar `useAgendaData` reativo**:

Em `src/hooks/useAgendaData.ts`:
- Extrair o `fetchDeadlines` para fora do `useEffect` (memoizado em um `useCallback`).
- Adicionar um segundo `useEffect` que escuta `window.addEventListener('deadline-completion-changed', ...)` e re-executa o fetch.
- **Atualização otimista**: antes de re-fazer o fetch (que tem latência de rede), aplicar a mudança imediatamente no state local via `setDeadlines(prev => prev.map(d => d.id === deadlineId ? { ...d, completed } : d))`. Isso garante que o card "salta" de coluna **na hora**, sem flicker, sem loading spinner. O fetch posterior só consolida (campos `concluidoEm`, `completedByName`, etc.).

**3. Transição visual sutil** (opcional, polimento):

Em `PlanejadorPrazosView.tsx`, adicionar uma classe de transição `transition-all duration-300` no container das colunas e nos cards, para que a mudança de coluna seja suave (fade-in/out) em vez de "pulo" abrupto. Sem animação chamativa — só um leve crossfade.

### Arquivos afetados

**Modificados:**
- `src/hooks/useAgendaData.ts` — extrair `fetchDeadlines` em `useCallback`; adicionar listener de `deadline-completion-changed` com atualização otimista + refetch.
- `src/components/Agenda/DeadlineDetailDialog.tsx` — disparar event após `handleConfirmComplete` e `handleReopenDeadline`.
- `src/components/Agenda/AgendaContent.tsx` — disparar event após `handleToggleComplete`, `handleConfirmComplete`, `handleDeleteDeadline`.
- `src/components/Project/ProjectProtocoloContent.tsx` — disparar event após marcar conclusão de prazo.
- `src/components/Planejador/PlanejadorPrazosView.tsx` — adicionar `transition-all duration-300` nos cards/colunas para a animação sutil de movimento entre colunas.

**Sem mudanças:** banco/RLS, tabela `deadlines`, lógica de classificação por coluna, demais componentes do Planejador (Kanban de tarefas continua funcionando como hoje, esse é separado).

### Impacto

**Usuário final (UX):**
- Ao concluir um prazo pelo dialog (a partir do Planejador, da Agenda ou do Protocolo), o card sai da coluna "Hoje/Vencido/Esta Semana" e aparece em "Concluído" **imediatamente** — sem precisar recarregar a página, fechar/abrir o Planejador ou aguardar.
- Mudança é visualmente sutil (transição de 300ms), sem flash de loading, sem reordenação abrupta de outros cards.
- Funciona nos dois sentidos: concluir → vai para "Concluído"; reabrir → volta para a coluna correspondente à data.
- Exclusão de prazo também some do Planejador na hora.

**Dados:**
- Zero mudança de schema, RLS, migrations.
- Zero requisição extra desnecessária — só refetch quando algo realmente muda.
- Atualização otimista evita "piscar" em redes lentas (tenant remoto, mobile 3G).

**Riscos colaterais:**
- Mínimos. O refetch após o event é assíncrono e não bloqueia UI.
- Se o update no banco falhar, o state otimista é sobrescrito pelo refetch — o card "volta" para a coluna original (comportamento correto: o usuário vê que falhou).
- O CustomEvent é global — outros componentes que usem `useAgendaData` no futuro herdam o mesmo comportamento reativo automaticamente.

**Quem é afetado:**
- Todos os usuários que usam Planejador → aba "Prazos", em todos os tenants jurídicos.
- Também melhora a Agenda (qualquer tela que use `useAgendaData`).

### Validação

1. Abrir Planejador → aba "Prazos" → clicar em um prazo da coluna "Hoje" → no dialog, clicar "Concluir prazo" → confirmar.
2. **Esperado:** o card desaparece de "Hoje" e aparece em "Concluído" suavemente, em <1s, sem reload.
3. Repetir reabrindo (botão "Reabrir prazo" no dialog) → card volta para a coluna correta de acordo com a data.
4. Concluir um prazo pela tela `/demorais/agenda` com o Planejador aberto em outra aba → na aba do Planejador, ao voltar o foco, prazo já está concluído (após próximo refetch).
5. Concluir prazo via `ProjectProtocoloContent` (página do projeto) → se Planejador estiver aberto, atualiza igual.
6. Excluir um prazo no dialog → some do Planejador imediatamente.
7. Tema claro e escuro: animação suave em ambos.

