

## Plano: Corrigir Timer do Autenticador TOTP

### Problema Identificado

O timer circular está estático porque:

1. O estado `secondsRemaining` é inicializado com valor fixo `30` ao invés de calcular o valor atual
2. O `useEffect` que atualiza o timer tem `generateAllCodes` como dependência, causando recriação desnecessária do intervalo
3. O intervalo pode não iniciar corretamente quando o sheet abre

### Correções

#### Arquivo: `src/components/Dashboard/TOTPSheet.tsx`

**Alteração 1**: Inicializar `secondsRemaining` com o valor real

```typescript
// Antes (linha 100)
const [secondsRemaining, setSecondsRemaining] = useState(30);

// Depois
const [secondsRemaining, setSecondsRemaining] = useState(getSecondsRemaining());
```

**Alteração 2**: Separar o timer do effect de geração de códigos

O `useEffect` atual mistura duas responsabilidades:
- Atualizar o contador de segundos
- Regenerar os códigos quando o timer zera

Vamos separar em dois effects e usar uma ref para evitar recriação desnecessária:

```typescript
// Effect 1: Timer sempre ativo quando sheet está aberto
useEffect(() => {
  if (!open) return;

  // Atualizar imediatamente
  setSecondsRemaining(getSecondsRemaining());

  const interval = setInterval(() => {
    const remaining = getSecondsRemaining();
    setSecondsRemaining(remaining);
  }, 1000);

  return () => clearInterval(interval);
}, [open]);

// Effect 2: Gerar códigos quando tokens mudam ou timer reseta
useEffect(() => {
  if (!open || tokens.length === 0) return;
  
  generateAllCodes();
}, [open, tokens.length]); // Apenas quando tokens mudam

// Effect 3: Regenerar códigos quando timer reseta
useEffect(() => {
  if (secondsRemaining === 30 && tokens.length > 0) {
    generateAllCodes();
  }
}, [secondsRemaining]);
```

**Alteração 3**: Ajustar o `useCallback` do `generateAllCodes`

Remover `tokens` da dependência do useCallback para evitar recriações, usando uma ref:

```typescript
const tokensRef = useRef(tokens);
tokensRef.current = tokens;

const generateAllCodes = useCallback(async () => {
  const newCodes: Record<string, string> = {};
  for (const token of tokensRef.current) {
    try {
      newCodes[token.id] = await generateTOTP(token.secret);
    } catch {
      newCodes[token.id] = '------';
    }
  }
  setCodes(newCodes);
}, []);
```

---

### Resumo das Alterações

| Linha | Alteração |
|-------|-----------|
| 100 | Inicializar com `getSecondsRemaining()` |
| 122-132 | Usar ref para tokens no callback |
| 135-150 | Separar em 3 effects independentes |

### Resultado

- Timer atualiza corretamente a cada segundo
- Círculo esvazia progressivamente
- Cor muda para vermelho nos últimos 5 segundos
- Códigos regeneram automaticamente quando o timer zera

