

# Reverter: Remover botão "Tentar buscar novamente"

## Solicitação

Remover o botão "Tentar buscar novamente" que foi adicionado ao estado vazio de andamentos.

## Alteração

### src/components/Controladoria/ProcessoOABDetalhes.tsx

Voltar ao estado anterior simples:

```tsx
// ATUAL (com botão):
) : andamentos.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground space-y-4">
    <div>
      <Clock className="w-8 h-8 mx-auto mb-2" />
      <p>Nenhum andamento encontrado</p>
      <p className="text-xs mt-1">Os andamentos podem não estar disponíveis ainda no tribunal.</p>
    </div>
    {onCarregarDetalhes && (
      <Button ...>
        Tentar buscar novamente
      </Button>
    )}
  </div>
)

// REVERTER PARA:
) : andamentos.length === 0 ? (
  <div className="text-center py-8 text-muted-foreground">
    <Clock className="w-8 h-8 mx-auto mb-2" />
    <p>Nenhum andamento encontrado</p>
  </div>
)
```

## Arquivo

1. `src/components/Controladoria/ProcessoOABDetalhes.tsx` - linhas 926-953

