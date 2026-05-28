## Causa raiz

Ao clicar na notificação "Mencionado em protocolo", o `DashboardLayout` já abre o `ProjectDrawer` com `pendingProtocoloId`, e o `ProjectView` ainda troca o workspace ativo para o do protocolo. Porém, dentro de `ProjectProtocolosList.tsx`, o `useEffect` que consome `initialProtocoloId` chama `onProtocoloConsumed?.()` **incondicionalmente**, mesmo quando o protocolo ainda não foi encontrado na lista atual:

```
useEffect(() => {
  if (!initialProtocoloId || loading || !protocolos.length) return;
  const found = protocolos.find(p => p.id === initialProtocoloId);
  if (found) {
    setSelectedProtocoloId(found.id);
    setView('detalhes');
  }
  onProtocoloConsumed?.(); // ← roda mesmo quando found === undefined
}, [initialProtocoloId, loading, protocolos]);
```

Sequência da corrida:
1. Drawer abre no workspace padrão (`defaultWorkspaceId`). Os protocolos desse workspace carregam, mas **não** contêm o protocolo da notificação.
2. `protocolos.length > 0` e `found === undefined` → `onProtocoloConsumed()` zera `pendingProtocoloId` no `DashboardLayout`.
3. Em paralelo, `ProjectView.lookupProtocoloWorkspace` muda o `activeWorkspaceId` para o workspace correto. Os protocolos recarregam e agora contêm o item buscado.
4. Mas `initialProtocoloId` já é `null`, então o efeito retorna cedo e o protocolo nunca abre — o usuário fica vendo apenas o projeto.

## Correção

**Arquivo:** `src/components/Project/ProjectProtocolosList.tsx`

Mover `onProtocoloConsumed?.()` para dentro do `if (found)`, garantindo que o consumo só ocorre quando o protocolo de fato foi localizado e o drawer de detalhes foi aberto. Sem o `found`, mantemos o `initialProtocoloId` vivo para que o próximo ciclo (após o workspace correto carregar a lista) possa abrir.

```tsx
useEffect(() => {
  if (!initialProtocoloId || loading || !protocolos.length) return;
  const found = protocolos.find(p => p.id === initialProtocoloId);
  if (found) {
    setSelectedProtocoloId(found.id);
    setView('detalhes');
    onProtocoloConsumed?.();
  }
}, [initialProtocoloId, loading, protocolos]);
```

Nenhuma outra mudança é necessária: o pipeline notificação → `onProtocoloNavigation` → `ProjectDrawer` → `ProjectView` → `ProjectProtocolosList` já existe e está correto, só estava sendo abortado prematuramente.

## Arquivos afetados

- `src/components/Project/ProjectProtocolosList.tsx` (1 efeito)

## Impacto

1. **UX:** Clicar em "Mencionado em protocolo" passa a abrir o projeto **e** já posiciona o usuário direto na tela de detalhes do protocolo mencionado (e não mais na lista geral, exigindo busca manual). Vale para qualquer tenant/usuário.
2. **Dados:** Nenhuma alteração — sem migration, sem RLS, sem novos índices.
3. **Riscos colaterais:** Baixíssimos. Se o protocolo não pertencer mais ao projeto (ex.: excluído), `found` será sempre `undefined` e o efeito nunca consome `initialProtocoloId`. Mitigação: o `pendingProtocoloId` é zerado quando o `ProjectDrawer` fecha (`if (!open) setPendingProtocoloId(null)` no `DashboardLayout`), então não há vazamento de estado entre aberturas.
4. **Quem é afetado:** Qualquer usuário de qualquer tenant que receba notificações `comment_mention` de protocolos (Solvenza e todos os demais).

## Validação

- Logar como Wesley (ou outro usuário mencionado), clicar na notificação "Mencionado em protocolo" no `/dashboard` → drawer do projeto abre **e** a tela de detalhes do protocolo já está aberta automaticamente.
- Confirmar que troca de workspace funciona: protocolo de um workspace diferente do padrão também abre direto.
- Confirmar que abrir um projeto sem `initialProtocoloId` (busca rápida normal) continua exibindo a lista de protocolos como antes.
- Confirmar que fechar e reabrir o drawer não tenta reabrir um protocolo antigo.
