

# Gráfico de Origens + Quadro de Faixas de Valores no Dashboard

## Resumo

Duas adições ao dashboard de Analytics de Clientes:

1. **Gráfico de Origem dos Clientes** — Barras horizontais coloridas mostrando distribuição por origem (Instagram Orgânico, Instagram Tráfego, Facebook Orgânico, Facebook Tráfego, Indicação, Outro)
2. **Quadro de Distribuição de Valores de Contrato** — Card estilizado em lista com faixas de valor, mostrando quantidade de clientes por faixa, média, menor e maior valor

## Alterações

### 1. Expandir opções de origem

**`src/types/cliente.ts`** — Atualizar tipo `origem_tipo` para incluir as 6 opções:
`'instagram_organico' | 'instagram_trafego' | 'facebook_organico' | 'facebook_trafego' | 'indicacao' | 'outro'`

**`src/lib/validations/cliente.ts`** — Atualizar enum zod com os 6 valores

**`src/components/CRM/ClienteForm.tsx`** — Atualizar SelectItems (6 opções)

**`src/components/CRM/ClienteDetails.tsx`** — Atualizar labels de exibição

### 2. Migração SQL — Converter dados existentes

```sql
UPDATE clientes SET origem_tipo = 'instagram_organico' WHERE origem_tipo = 'instagram';
UPDATE clientes SET origem_tipo = 'facebook_organico' WHERE origem_tipo = 'facebook';
```

### 3. Adicionar dados de origem e faixas de valor ao analytics

**`src/types/analytics.ts`** — Adicionar:
- `OrigemData { origem: string; label: string; count: number; percentage: number }`
- `FaixaValorData { faixa: string; min: number; max: number; count: number; percentage: number }`
- Campos `distribuicaoOrigens`, `distribuicaoValores`, `menorContrato`, `maiorContrato` no `ClienteAnalytics`

**`src/hooks/useClienteAnalytics.ts`** — Calcular:
- Contagem por `origem_tipo` (agrupado)
- Faixas de valor: R$0-1k, 1k-3k, 3k-5k, 5k-10k, 10k-20k, 20k-50k, 50k+
- Menor e maior valor de contrato

### 4. Criar componentes de gráfico

**`src/components/Dashboard/ClienteOrigensChart.tsx`** (novo) — Gráfico de barras horizontais com Recharts, cores distintas por origem (tons de rosa/roxo para Instagram, azul para Facebook, verde para Indicação, cinza para Outro)

**`src/components/Dashboard/ClienteValoresCard.tsx`** (novo) — Card com:
- Header com ícone DollarSign
- Lista estilizada de faixas de valor, cada item com barra de progresso proporcional, contagem e percentual
- Footer com menor valor, maior valor e média

### 5. Integrar no dashboard

**`src/components/Dashboard/ClienteAnalytics.tsx`** — Adicionar uma nova row abaixo dos gráficos de pizza com grid `lg:grid-cols-2`:
- Coluna 1: Gráfico de origens
- Coluna 2: Quadro de faixas de valores

### Arquivos modificados/criados
- `src/types/cliente.ts`
- `src/types/analytics.ts`
- `src/lib/validations/cliente.ts`
- `src/hooks/useClienteAnalytics.ts`
- `src/components/CRM/ClienteForm.tsx`
- `src/components/CRM/ClienteDetails.tsx`
- `src/components/Dashboard/ClienteAnalytics.tsx`
- `src/components/Dashboard/ClienteOrigensChart.tsx` (novo)
- `src/components/Dashboard/ClienteValoresCard.tsx` (novo)
- Migração SQL

