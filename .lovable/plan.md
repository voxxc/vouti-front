

## Plano: Indicador Circular de Tempo (Timer Visual)

### Resumo
Substituir a barra de progresso linear (`Progress`) por um indicador circular SVG que funciona como um relógio, começando cheio e "esvaziando" conforme os 30 segundos passam.

---

## Visual

```text
Antes (barra linear):
┌─────────────────────────────────────────┐
│  Gmail                           [🗑]   │
│                                         │
│     4 2 3   8 9 1                       │
│                                         │
│  [████████████░░░░░░░░░] 18s            │
└─────────────────────────────────────────┘

Depois (timer circular):
┌─────────────────────────────────────────┐
│  Gmail                           [🗑]   │
│                                         │
│     4 2 3   8 9 1          ⏱            │
│                           (18)          │
│                                         │
└─────────────────────────────────────────┘

O circulo:
  - Comeca CHEIO (30s)
  - Vai "gastando" no sentido horario
  - Quando chega em 0, reseta para cheio
  - Numero de segundos no centro
```

---

## Implementacao Tecnica

### Componente CircularTimer (SVG)

Criar um componente inline no `TOTPSheet.tsx` usando SVG:

```typescript
interface CircularTimerProps {
  secondsRemaining: number;
  totalSeconds?: number;
}

function CircularTimer({ secondsRemaining, totalSeconds = 30 }: CircularTimerProps) {
  const size = 40;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = secondsRemaining / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Circulo de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Circulo de progresso (vai diminuindo) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Numero no centro */}
      <span className="absolute text-xs font-medium text-muted-foreground">
        {secondsRemaining}
      </span>
    </div>
  );
}
```

### Modificacoes no Layout do Card

Reorganizar para colocar o timer ao lado do codigo:

```typescript
<button onClick={() => handleCopy(...)} className="w-full text-left group">
  <div className="flex items-center justify-between">
    <div className="text-3xl font-mono font-bold tracking-wider">
      {formatCode(codes[token.id] || '------')}
      {copiedId === token.id ? (
        <Check className="inline h-5 w-5 text-green-500 ml-2" />
      ) : (
        <Copy className="inline h-5 w-5 opacity-0 group-hover:opacity-50 ml-2" />
      )}
    </div>
    <CircularTimer secondsRemaining={secondsRemaining} />
  </div>
</button>
```

---

## Arquivo a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `src/components/Dashboard/TOTPSheet.tsx` | Adicionar componente CircularTimer e substituir Progress |

---

## Comportamento Visual

1. **30s restantes**: Circulo CHEIO (100%)
2. **15s restantes**: Circulo pela METADE (50%)
3. **5s restantes**: Pequeno arco restante + cor muda para vermelho/alerta
4. **0s -> 30s**: Circulo reseta para cheio, novo codigo gerado

---

## Detalhes de Estilo

- **Tamanho**: 40x40px (compacto)
- **Animacao**: Transicao suave de 1 segundo entre estados
- **Cores**: 
  - Normal: `text-primary` (cor do tema)
  - Ultimos 5s: `text-destructive` (vermelho/alerta)
- **Fundo**: Circulo cinza claro para contraste

