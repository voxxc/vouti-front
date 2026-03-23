

# Adicionar paginação nas abas de OAB individual

## Problema
Nas abas de OAB individual (ex: Andriola na Solvenza), todos os processos carregam de uma vez. Com muitos processos, a lista fica enorme. A aba Geral já tem controle de 20 por página.

## Solução
Adicionar paginação client-side no `OABTab.tsx`, aplicada sobre os `processosFiltrados` antes do agrupamento por instância. Reutilizar o mesmo componente `PaginationControls` da GeralTab.

## Alterações

### 1. `src/components/Controladoria/OABTab.tsx`

- Adicionar constante `PAGE_SIZE = 20`
- Adicionar estado `page` (number, default 0)
- Após calcular `processosFiltrados`, criar `processosPaginados` com slice de `page * PAGE_SIZE` a `(page+1) * PAGE_SIZE`
- Resetar `page` para 0 quando `filtroUF` ou `termoBusca` mudar
- Usar `processosPaginados` no `agruparPorInstancia` em vez de `processosFiltrados`
- Adicionar componente `PaginationControls` (mesmo padrão da GeralTab) abaixo da lista de processos
- Importar `ChevronLeft`, `ChevronRight` do lucide-react

### Fluxo de dados
```text
processos (todos)
  → processosFiltrados (filtro UF + busca)
    → processosPaginados (slice de 20)
      → processosAgrupados (por instância)
```

| Arquivo | Mudança |
|---------|---------|
| `src/components/Controladoria/OABTab.tsx` | Adicionar paginação client-side com 20 itens por página |

