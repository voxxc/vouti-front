
## Compactar cards de processos na aba Geral

### Problema

Os cards de processos na aba Geral estao ocupando espaco demais, forçando o usuario a dar zoom out para visualizar os botoes. Isso acontece porque:

1. Os badges (Monitorado, novos, tribunal) fazem `flex-wrap`, empurrando conteudo para novas linhas
2. O botao "Detalhes" com texto ocupa espaco horizontal desnecessario
3. Com 300+ processos, o layout vertical se acumula

### Solucao

Ajustar o `ProcessoCardGeral` para ser mais compacto:

1. **Botao "Detalhes"**: Trocar de botao com texto para botao icon-only (apenas o icone Eye), com tooltip explicativo -- economiza espaco horizontal
2. **Layout inline**: Colocar o tribunal badge na mesma linha do CNJ em vez de numa linha separada abaixo
3. **Reduzir padding**: Diminuir o padding do card de `p-3` para `p-2`
4. **Badges mais compactos**: Remover texto "Monitorado" do badge, deixar apenas o icone Bell com tooltip
5. **Remover flex-wrap**: Usar `overflow-hidden` e `flex-nowrap` para manter tudo em uma unica linha

### Alteracao tecnica

**Arquivo: `src/components/Controladoria/OABTabGeral.tsx`**

Reescrever o componente `ProcessoCardGeral` (linhas 75-121):

```
Antes:
- Card com p-3
- Badges com flex-wrap (podem criar linhas extras)
- Botao "Detalhes" com texto
- Tribunal badge em linha separada (mt-1)

Depois:
- Card com p-2
- Badges inline sem wrap, com overflow hidden
- Botao icon-only (Eye) com tooltip
- Tribunal badge na mesma linha do CNJ
- Tudo em uma unica linha horizontal
```

Estrutura final do card:

```
[CNJ | Bell icon | "3 novos" | TJSP] .................. [Eye button]
[Autor vs Reu (truncado)]
```

### Arquivo modificado

| Arquivo | Acao |
|---|---|
| `src/components/Controladoria/OABTabGeral.tsx` | Modificar -- compactar ProcessoCardGeral |
