

## Plano: Correção de Exibição de Datas de Vencimento (Timezone)

### Problema Identificado
Ao criar uma cobrança com vencimento em **10/01**, o sistema exibe **09/01** para o cliente. Isso ocorre porque:

1. A data é salva no banco como `"2026-01-10"` (apenas data, sem hora)
2. Quando `new Date("2026-01-10")` é chamado, o JavaScript interpreta como **UTC meia-noite**
3. Ao converter para o fuso horário do Brasil (UTC-3), a data "volta" para o dia anterior às 21h do dia 09

### Solucao
Criar uma funcao utilitaria `parseLocalDate` que interpreta a data como local (e nao UTC), e substituir todos os usos de `new Date(data_vencimento)` por essa funcao.

```typescript
// src/lib/dateUtils.ts
export function parseLocalDate(dateString: string): Date {
  // Formato esperado: "2026-01-10" ou similar
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 porque Date usa 0-indexed
}
```

### Arquivos a Modificar

| Arquivo | Linhas Afetadas |
|---------|-----------------|
| `src/lib/dateUtils.ts` | **CRIAR** arquivo com funcao `parseLocalDate` |
| `src/components/Support/BoletoPaymentDialog.tsx` | Linha 166 |
| `src/components/Support/SubscriptionDrawer.tsx` | Linha 544 |
| `src/components/SuperAdmin/SuperAdminBoletosDialog.tsx` | Linha 431 |

### Mudancas Especificas

**1. Criar `src/lib/dateUtils.ts`**
```typescript
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
```

**2. BoletoPaymentDialog.tsx (linha 166)**

De:
```typescript
{format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
```

Para:
```typescript
{format(parseLocalDate(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
```

**3. SubscriptionDrawer.tsx (linha 544)**

De:
```typescript
Venc. {format(new Date(boleto.data_vencimento), "dd/MM", { locale: ptBR })}
```

Para:
```typescript
Venc. {format(parseLocalDate(boleto.data_vencimento), "dd/MM", { locale: ptBR })}
```

**4. SuperAdminBoletosDialog.tsx (linha 431)**

De:
```typescript
Vencimento: {format(new Date(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
```

Para:
```typescript
Vencimento: {format(parseLocalDate(boleto.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
```

### Resultado Esperado

- Data criada: **10/01/2026**
- Data exibida: **10/01/2026** (correta!)

Essa mesma funcao pode ser reutilizada em outras partes do sistema que tenham o mesmo problema de timezone com datas.

