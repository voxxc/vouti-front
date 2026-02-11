

## Filtro de ordenacao no Extras > Controle

Adicionar um botao/select de ordenacao ao lado da barra de busca no `ControleTab.tsx` para permitir ordenar os registros, com foco em mostrar os mais antigos primeiro (por "Ultima Consulta").

### Alteracoes em `src/components/Extras/ControleTab.tsx`

- Adicionar um estado `sortBy` com opcoes como:
  - **Mais antigos primeiro** (ultima_consulta ASC, nulls primeiro) -- padrao
  - **Mais recentes primeiro** (ultima_consulta DESC)
  - **Cliente A-Z**
  - **Cliente Z-A**
- Adicionar um componente `Select` ao lado do campo de busca para escolher a ordenacao
- Aplicar a ordenacao no `useMemo` do `filtered`, apos o filtro de busca

### Logica de ordenacao

Registros sem data de ultima consulta aparecerao no topo quando ordenado por "mais antigos primeiro", pois sao os que nunca foram consultados.

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| `src/components/Extras/ControleTab.tsx` | Adicionar select de ordenacao e logica de sort no useMemo |

