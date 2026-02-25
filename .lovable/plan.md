

## Carteiras minimalistas no Workspace

### Mudança

Arquivo: `src/components/Project/ProjectProtocolosList.tsx` (linhas 491-527)

Trocar o estilo "card" do header da carteira (atualmente `rounded-lg border bg-muted/30 p-3`) por um layout minimalista:

**Antes (card):**
```
┌──────────────────────────────────────┐
│ 📁 Urgentes              (2) ✏️ 🗑 ▼ │  ← borda, fundo, padding
└──────────────────────────────────────┘
│ border-l colorida
│  PROCESSO A
│  PROCESSO B
```

**Depois (minimalista):**
```
📁 Urgentes (2)            ✏️ 🗑 ▼     ← sem borda/fundo, nome clicável
│ border-l colorida
│  PROCESSO A
│  PROCESSO B
```

### Detalhes técnicos

Na linha 493, o `<button>` do `CollapsibleTrigger` atualmente tem:
```
className="w-full flex items-center gap-2 p-3 rounded-lg border bg-muted/30 hover:opacity-90 transition-opacity"
```

Substituir por:
```
className="w-full flex items-center gap-2 py-2 hover:opacity-80 transition-opacity"
```

Remover `p-3`, `rounded-lg`, `border`, `bg-muted/30`. Manter apenas um padding vertical leve (`py-2`) e o hover sutil.

O nome da carteira (linha 495 `<span>`) ganha estilo clicável:
```
className="font-semibold text-sm hover:underline cursor-pointer"
```

A linha colorida lateral (`border-l-2` na linha 534) permanece como está — o usuário gostou dela.

### Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `src/components/Project/ProjectProtocolosList.tsx` | Remover estilo card do header da carteira, tornar nome visualmente clicável |

