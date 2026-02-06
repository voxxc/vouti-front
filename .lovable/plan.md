
# Padronizar Formatação de Valores Monetários

## Resumo
Criar uma função utilitária centralizada `formatCurrency` e aplicá-la em todo o sistema para garantir que valores monetários sejam exibidos no formato brasileiro: `2.500,00` (com ponto como separador de milhar e vírgula como separador decimal).

---

## Problema Atual

O sistema usa `.toFixed(2)` em vários lugares, que gera formato americano:
- **Atual**: `2500.00` ou `25000,00` (com replace parcial)
- **Esperado**: `2.500,00`

### Exemplos encontrados:

```tsx
// Formato incorreto
`R$ ${dados.valor_pago.toFixed(2)}`  // Gera: R$ 2500.00

// Replace parcial (ainda incorreto para milhares)
`R$ ${valorPagamento.toFixed(2).replace('.', ',')}`  // Gera: R$ 2500,00 (sem ponto de milhar)
```

---

## Solução

### 1. Criar Função Utilitária Centralizada

Adicionar em `src/lib/utils.ts`:

```tsx
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Versão sem o prefixo "R$" para uso em campos e contextos específicos
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0,00';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

### 2. Substituir Todos os Usos de `.toFixed(2)`

| Arquivo | Local | De | Para |
|---------|-------|----|------|
| `useClienteParcelas.ts` | linha 117 | `R$ ${dados.valor_pago.toFixed(2)}` | `${formatCurrency(dados.valor_pago)}` |
| `useClienteParcelas.ts` | linha 117 | `R$ ${saldoRestante.toFixed(2)}` | `${formatCurrency(saldoRestante)}` |
| `useClienteParcelas.ts` | linha 133 | `R$ ${saldoRestante.toFixed(2)}` | `${formatCurrency(saldoRestante)}` |
| `useClienteParcelas.ts` | linha 252 | `R$ ${valorPagamento.toFixed(2).replace('.', ',')}` | `${formatCurrency(valorPagamento)}` |
| `ClienteFinanceiroDialog.tsx` | linha 593 | `R$ ${valorPago.toFixed(2).replace('.', ',')}` | `${formatCurrency(valorPago)}` |
| `DividaContent.tsx` | linha 511 | `R$ ${valor.toFixed(2).replace('.', ',')}` | `${formatCurrency(valor)}` |
| `EditarParcelaDialog.tsx` | linha 93 | `R$ ${parcela.valor_parcela.toFixed(2)}` | `${formatCurrency(parcela.valor_parcela)}` |
| `ColaboradorForm.tsx` | linha 296 | `R$ ${...toFixed(2)}` | `${formatCurrency(...)}` |

### 3. Remover Funções `formatCurrency` Locais Duplicadas

Vários arquivos já têm funções locais que serão substituídas pelo import centralizado:
- `src/pages/Financial.tsx` (linha 234)
- `src/components/Financial/FolhaPagamentoCard.tsx` (linha 41)
- `src/components/SuperAdmin/SuperAdminBuscaGeral.tsx` (linha 154)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/utils.ts` | Adicionar funções `formatCurrency` e `formatNumber` |
| `src/hooks/useClienteParcelas.ts` | Substituir 4 ocorrências de `.toFixed(2)` |
| `src/components/Financial/ClienteFinanceiroDialog.tsx` | Substituir 1 ocorrência |
| `src/components/Financial/DividaContent.tsx` | Substituir 1 ocorrência |
| `src/components/Financial/EditarParcelaDialog.tsx` | Substituir 2 ocorrências |
| `src/components/Financial/ColaboradorForm.tsx` | Substituir 1 ocorrência |
| `src/pages/Financial.tsx` | Remover função local, usar import |
| `src/components/Financial/FolhaPagamentoCard.tsx` | Remover função local, usar import |
| `src/components/SuperAdmin/SuperAdminBuscaGeral.tsx` | Remover função local, usar import |

---

## Resultado Visual

| Valor | Antes | Depois |
|-------|-------|--------|
| 2500 | `R$ 2500.00` ou `R$ 2500,00` | `R$ 2.500,00` |
| 15000 | `R$ 15000.00` | `R$ 15.000,00` |
| 1234567.89 | `R$ 1234567.89` | `R$ 1.234.567,89` |

---

## Detalhes Técnicos

A função `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })` já é usada em alguns lugares do sistema (como `Financial.tsx`), o que garante que a abordagem está correta. A diferença é centralizar e padronizar para evitar inconsistências.

Benefícios:
- Formato brasileiro consistente em todo o sistema
- Código mais limpo e reutilizável
- Facilidade de manutenção futura
- Tratamento automático de valores nulos/undefined
