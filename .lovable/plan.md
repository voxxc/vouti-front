## Causa raiz
Os botões "Baixar" em `ReuniaoArquivos.tsx` e `ClienteArquivosTab.tsx` disparam `downloadArquivo(arquivo)` sem nenhum feedback visual. Como o fetch do arquivo no Storage + criação do blob pode levar alguns segundos, o usuário clica múltiplas vezes achando que não funcionou.

## Correção
Adicionar estado de loading por arquivo (Set de IDs em download) nos hooks `useReuniaoArquivos` e `useReuniaoClienteArquivos`, expondo `downloadingIds: Set<string>`. Nos botões:
- Desabilitar enquanto o ID estiver em download.
- Trocar o ícone `Download` por `Loader2` com `animate-spin`.
- Trocar o texto "Baixar" por "Baixando…".

## Arquivos afetados
- `src/hooks/useReuniaoArquivos.ts` — adicionar `downloadingIds` (useState Set), envolver `downloadArquivo` com add/remove do id em try/finally.
- `src/hooks/useReuniaoClienteArquivos.ts` — mesma alteração.
- `src/components/Reunioes/ReuniaoArquivos.tsx` — consumir `downloadingIds`, aplicar `disabled` e ícone `Loader2` no botão.
- `src/components/Reunioes/ClienteArquivosTab.tsx` — idem.

## Impacto
1. **UX**: ao clicar em "Baixar", o botão fica desabilitado, ícone vira spinner e texto muda para "Baixando…" até concluir. Elimina cliques duplicados. Outros arquivos da lista continuam clicáveis (loading é por ID).
2. **Dados**: nenhuma alteração — sem migration, sem RLS, sem mudança de policies.
3. **Riscos colaterais**: muito baixos; apenas estado local de UI. Se o download falhar, o `finally` libera o botão.
4. **Quem é afetado**: todos os usuários que baixam anexos em Reuniões (aba de arquivos da reunião e aba de arquivos do cliente), em todos os tenants.

## Validação
- Clicar em "Baixar" em um arquivo grande → botão mostra spinner + "Baixando…" e fica disabled.
- Cliques repetidos no mesmo botão são ignorados.
- Botões de outros arquivos continuam funcionais em paralelo.
- Ao finalizar (sucesso ou erro), botão volta ao estado normal.