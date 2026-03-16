

# Preços promocionais na HomePage

## O que muda

Nos 4 planos pagos (Essencial, Estrutura, Expansão, Enterprise), exibir um preço "DE" riscado (25% acima do valor real) e o valor atual como se fosse promocional. O plano Solo (FREE) fica igual.

| Plano | Preço "DE" (riscado) | Preço real |
|-------|---------------------|------------|
| Essencial | R$ 250 | R$ 200 |
| Estrutura | R$ 500 | R$ 400 |
| Expansão | R$ 750 | R$ 600 |
| Enterprise | R$ 1.250 | R$ 1.000 |

## Mudanças — `src/pages/HomePage.tsx`

### 1. Adicionar campo `originalPrice` nos planos pagos

```typescript
{ name: 'Essencial', price: 200, originalPrice: 250, ... },
{ name: 'Estrutura', price: 400, originalPrice: 500, ... },
{ name: 'Expansão', price: 600, originalPrice: 750, ... },
{ name: 'Enterprise', price: 1000, originalPrice: 1250, ... },
```

### 2. Alterar bloco de exibição de preço (linhas 627-637)

Onde hoje exibe só o preço, adicionar:
- Se `originalPrice` existe: linha riscada cinza com "DE R$ X" + preço real em destaque
- Manter "FREE" para o plano Solo (sem `originalPrice`)

```tsx
{plan.price === 0 ? (
  <span className="text-3xl font-black text-[#E11D48]">FREE</span>
) : (
  <div className="flex flex-col">
    {plan.originalPrice && (
      <span className="text-sm text-gray-400 line-through">
        De R$ {plan.originalPrice.toLocaleString('pt-BR')}
      </span>
    )}
    <div>
      <span className="text-3xl font-black text-[#0a0a0a]">
        R$ {plan.price.toLocaleString('pt-BR')}
      </span>
      <span className="text-sm text-gray-500">/mês</span>
    </div>
  </div>
)}
```

Mudança concentrada em 1 arquivo, ~15 linhas.

