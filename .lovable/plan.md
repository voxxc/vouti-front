

# Adicionar cores laranja/verde nas células de subtarefas

## O que muda

**Célula da tabela (linhas 441-448)**: Quando há subtarefas, calcular `pendentes`. Se `pendentes > 0`, o ícone `Flag` fica laranja. Se todas concluídas (`pendentes === 0`), fica verde.

```tsx
{prazo.subtarefas.length === 0 ? (
  <span className="text-muted-foreground text-xs">-</span>
) : (() => {
  const pendentes = prazo.subtarefas.filter(s => !s.concluida).length;
  return (
    <div className="flex items-center gap-1.5">
      <Flag className={`h-4 w-4 ${pendentes > 0 ? 'text-orange-500' : 'text-green-500'}`} />
      <span className="text-xs">Ver</span>
    </div>
  );
})()}
```

