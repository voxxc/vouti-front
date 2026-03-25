

# Revisão da Funcionalidade de Monitoramento

## Análise Completa

Revisei toda a cadeia de monitoramento:
- **Edge Function** `judit-ativar-monitoramento-oab`: Funcionando corretamente. Ativa/desativa via API Judit (POST /tracking, /pause, /resume), sincroniza todos os processos com mesmo CNJ no tenant, registra logs.
- **Hooks** `useOABs`, `useAllProcessosOAB`, `ProjectProcessos`: Todos chamam a mesma edge function com os parâmetros corretos e fazem `fetchProcessos` após o toggle.
- **Hook legado** `useToggleMonitoramento`: Usa API Escavador (diferente), usado apenas no `AgendaContent` — sistema separado, não relacionado à Controladoria.
- **Hook legado** `useMonitoramentoJudit`: Usa edge functions antigas (`judit-buscar-processo`, `judit-ativar-monitoramento`, `judit-desativar-monitoramento`) — parece não ser usado na Controladoria principal.

## Problema Encontrado

**Estado stale do `selectedProcesso` no drawer**: Em `OABTab`, `GeralTab` e `ProjectProcessos`, quando o usuário ativa/desativa monitoramento dentro do drawer (`ProcessoOABDetalhes`), o `fetchProcessos` atualiza a lista, mas o `selectedProcesso` no state local permanece com o valor antigo de `monitoramento_ativo`. O botão no drawer continua mostrando o estado anterior até fechar e reabrir.

## Solução

Adicionar um `useEffect` em cada componente pai (`OABTab`, `GeralTab`, `ProjectProcessos`) que sincroniza o `selectedProcesso` com a lista atualizada:

### Arquivos a modificar:

1. **`src/components/Controladoria/OABTab.tsx`** — Adicionar useEffect:
```tsx
useEffect(() => {
  if (selectedProcesso) {
    const updated = processos.find(p => p.id === selectedProcesso.id);
    if (updated && updated !== selectedProcesso) {
      setSelectedProcesso(updated);
    }
  }
}, [processos]);
```

2. **`src/components/Controladoria/GeralTab.tsx`** — Mesmo padrão, sincronizar `selectedProcesso` com `processos`.

3. **`src/components/Project/ProjectProcessos.tsx`** — Mesmo padrão, sincronizar com a lista local de processos vinculados.

Isso garante que após `fetchProcessos` atualizar a lista, o drawer reflete imediatamente o novo estado de `monitoramento_ativo`, `tracking_id`, etc.

## Conclusão

A lógica de backend (edge function, API Judit, sincronização de CNJs compartilhados) está **100% funcional**. O único gap é cosmético: o drawer não reflete a mudança em tempo real. A correção é simples — 3 useEffects de sync.

