

## Plano: Mover paginação para acima da barra de pesquisa

### O que muda

Nos dois arquivos, mover o bloco de paginação (que hoje fica **depois** da tabela) para **antes** da barra de busca por CNJ, ficando no topo da seção de filtros.

### Arquivos editados

#### 1. `GeralTab.tsx` (linhas 366-377 → mover para antes da linha 225)
- Recortar o bloco `{totalPages > 1 && (...)}` do final do componente
- Colar dentro do `<div className="flex-shrink-0 space-y-3">`, como primeiro filho (antes do filtro e da barra de busca)

#### 2. `OABTab.tsx` (linhas 394-409 → mover para antes da linha 244)
- Recortar o bloco `{totalPages > 1 && (...)}` do final do componente
- Colar dentro do `<div className="flex-shrink-0 space-y-3">`, como primeiro filho (antes do filtro e da barra de busca)

### Resultado visual

```text
[Paginação: ← Página 1 de 5 (120 processos) →]
[Filtro: Todos ▾]  [badge]
[🔍 Buscar por CNJ, partes ou tribunal...]
┌─────────────────────────────────────────┐
│ Tabela de processos                     │
└─────────────────────────────────────────┘
```

Nenhuma lógica alterada -- apenas reposicionamento do bloco JSX.

