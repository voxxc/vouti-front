## Causa raiz
Após importar um CNJ, `OABManager.onSuccess` chama `window.location.reload()`, forçando refresh completo da página (perda de scroll, estado das abas, recarregamento de todos os caches). Isso era um workaround porque a lista de processos (`OABTab` → `useProcessosOAB`) não era notificada da mudança.

## Correção
Remover o reload e fazer refresh silencioso via evento de janela.

1. Em `src/components/Controladoria/OABManager.tsx`:
   - No `onSuccess` do `ImportarProcessoCNJDialog`, manter `fetchOABs()` (atualiza contadores nas abas), remover `window.location.reload()` e disparar `window.dispatchEvent(new CustomEvent('oab:processos-changed', { detail: { oabId: selectedOabForImport.id } }))`.

2. Em `src/components/Controladoria/OABTab.tsx`:
   - Adicionar `useEffect` que escuta `oab:processos-changed`; quando `detail.oabId === oabId` (ou ausente), chama `fetchProcessos()` silenciosamente (sem alterar loading visual — `useProcessosOAB` já mantém os dados anteriores até o refetch completar).

## Arquivos afetados
- `src/components/Controladoria/OABManager.tsx`
- `src/components/Controladoria/OABTab.tsx`

## Impacto
- UX: ao importar um CNJ o modal fecha, a aba atual permanece, contadores e lista atualizam suavemente — sem flash branco nem perda de contexto.
- Dados: nenhum. Apenas reaproveita `fetchOABs`/`fetchProcessos` existentes.
- Riscos: baixos. Se a aba aberta não for a da OAB importada, ainda assim os contadores atualizam via `fetchOABs`; ao trocar para a aba, `OABTab` já refaz fetch no mount.
- Quem é afetado: usuários da Controladoria que importam processos via CNJ.

## Validação
- Importar um CNJ válido com a aba da OAB aberta → modal fecha, processo aparece na lista sem reload, badge de contagem incrementa.
- Importar um CNJ estando na aba "Geral" → contagem da OAB destino atualiza no header das abas.
