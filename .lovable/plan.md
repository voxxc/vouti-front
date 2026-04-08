

## Plano: Corrigir alinhamento dos resultados da Busca Global

### Problema
Na imagem, os resultados mostram o texto de conteúdo (descrição) muito longo sem quebra adequada, e o nome do projeto ("em AURELIANO...") fica desalinhado do badge. A data fica distante do conteúdo.

### Solução
Ajustar o layout do card de resultado em `GlobalSearch.tsx` (linhas 572-595):

1. **Badge + nome do projeto na mesma linha**, com `flex-wrap` e `flex-shrink-0` no badge
2. **Data ao lado do badge/nome** (mesma linha superior), não ao lado de todo o bloco
3. **Título com `break-words`** em vez de `truncate` para textos longos
4. **Conteúdo com `break-all`** para paths longos como `\\servidor\SETOR DE PERÍCIA\...`

### Mudança no arquivo
**`src/components/Search/GlobalSearch.tsx`** — linhas 572-595

Substituir o layout do CardContent por:
```tsx
<CardContent className="p-3">
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <Badge className={`text-xs shrink-0 ${getTypeColor(result.type)}`}>
          {getTypeLabel(result.type)}
        </Badge>
        {result.projectName && (
          <span className="text-xs text-muted-foreground truncate">
            em {result.projectName}
          </span>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {new Date(result.date).toLocaleDateString('pt-BR')}
      </span>
    </div>
    <h4 className="font-medium text-sm break-words">
      {result.title}
    </h4>
    <p className="text-xs text-muted-foreground line-clamp-2 break-all">
      {result.content}
    </p>
  </div>
</CardContent>
```

### Resumo
- Badge, nome do projeto e data ficam todos na linha superior
- Título e conteúdo abaixo, com quebra de palavra adequada para textos e paths longos
- Apenas 1 arquivo editado, ~25 linhas alteradas

