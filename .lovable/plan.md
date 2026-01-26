
## Plano de Correções - Financeiro e Clientes

### Problemas Identificados

| Problema | Causa | Complexidade |
|----------|-------|--------------|
| 1. Crash ao pesquisar | Ja corrigido - funcao `getNomeCliente` movida para antes do uso | Resolvido |
| 2. Datas das parcelas incorretas | Funcao SQL `gerar_parcelas_cliente` distribui dias uniformemente entre datas inicial/final em vez de manter dia fixo mensal | Alta |
| 3. Reabrir pagamento | Nao existe opcao para estornar/reabrir parcela paga | Media |
| 4. Dashboard com valor errado | Usa `valor_parcela` ao inves de `valor_pago` (coluna nao existe) | Alta |
| 5. Campo proveito economico + CNH em dados rapidos | Campo nao existe na tabela; CNH nao aparece nos cards do financeiro | Media |

---

### Correcao 1: Datas das Parcelas (Parcelamento Simples)

**Problema atual:** A funcao SQL calcula dias proporcionais:
```sql
dias_por_parcela := intervalo_dias / (numero_parcelas - 1);
data_vencimento := data_inicial + ((i-1) * dias_por_parcela)::INTEGER;
```
Isso gera: 10/09, 12/10, 13/11, 16/12... (dias aleatorios)

**Solucao:** Modificar para usar intervalos mensais mantendo o dia fixo:
```sql
-- Extrair o dia do mes da data inicial
dia_vencimento := EXTRACT(DAY FROM data_vencimento_inicial);

-- Para cada parcela, adicionar meses mantendo o dia
data_vencimento := data_vencimento_inicial + ((i-1) || ' months')::INTERVAL;

-- Se o dia nao existir no mes (ex: 31 em fevereiro), ajusta para ultimo dia
IF EXTRACT(DAY FROM data_vencimento) != dia_vencimento THEN
  data_vencimento := (DATE_TRUNC('month', data_vencimento) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
END IF;
```

Resultado esperado: 10/05, 10/06, 10/07, 10/08...

**Arquivos a modificar:**
- Criar nova migration SQL para atualizar `gerar_parcelas_cliente()`
- Adicionar opcao de regenerar parcelas para clientes existentes

---

### Correcao 2: Adicionar Coluna `valor_pago` na Tabela `cliente_parcelas`

**Problema:** Quando o cliente paga valor diferente do esperado, nao ha onde registrar.

**Solucao:**
```sql
ALTER TABLE cliente_parcelas ADD COLUMN valor_pago NUMERIC;
```

**Arquivos a modificar:**
- Nova migration SQL
- `src/types/financeiro.ts` - adicionar `valor_pago?: number`
- `src/hooks/useClienteParcelas.ts` - salvar `valor_pago` no `darBaixaParcela`
- `src/components/Financial/BaixaPagamentoDialog.tsx` - ja tem o campo
- `src/components/Financial/ClienteFinanceiroDialog.tsx` - usar `valor_pago` no calculo do `totalPago`
- `src/pages/Financial.tsx` - ajustar calculo no dashboard

**Logica de calculo:**
```typescript
// ANTES (errado):
const totalPago = parcelasPagas.reduce((acc, p) => acc + Number(p.valor_parcela), 0);

// DEPOIS (correto):
const totalPago = parcelasPagas.reduce((acc, p) => {
  // Se tem valor_pago registrado, usar ele. Senao, usar valor_parcela
  return acc + Number(p.valor_pago ?? p.valor_parcela);
}, 0);
```

---

### Correcao 3: Opcao para Reabrir Pagamento

**Implementacao:**
1. Adicionar menu "3 pontinhos" (DropdownMenu) em cada parcela paga
2. Opcoes: "Reabrir Pagamento", "Editar Informacoes"
3. Ao reabrir: alterar status para 'pendente' e limpar campos de pagamento

**Arquivos a modificar:**
- `src/components/Financial/ClienteFinanceiroDialog.tsx`:
  - Importar `DropdownMenu` do shadcn
  - Adicionar botao "..." com opcoes "Reabrir" e "Editar"
  - Criar funcao `handleReabrirParcela(parcelaId)`
- `src/hooks/useClienteParcelas.ts`:
  - Adicionar funcao `reabrirParcela(parcelaId)`
- `src/components/Financial/EditarPagamentoDialog.tsx`:
  - Novo componente para editar informacoes de pagamento ja feito

**UI proposta:**
```text
+--------------------------------------------+
| Parcela #3      [Pago]          [...]      |
|                                  |         |
| Valor: R$ 500                    | Reabrir |
| Pago em: 15/01/2026              | Editar  |
+--------------------------------------------+
```

---

### Correcao 4: Campo "Proveito Economico" e CNH nos Dados Rapidos

**Banco de dados:**
```sql
ALTER TABLE clientes ADD COLUMN proveito_economico NUMERIC;
-- CNH ja existe na tabela
```

**Arquivos a modificar:**

**A) Formulario de cadastro:**
- `src/components/CRM/ClienteForm.tsx`:
  - Adicionar campo "Proveito Economico (%)" na secao de contrato
  - Campo numerico com sufixo "%"
- `src/lib/validations/cliente.ts`:
  - Adicionar `proveito_economico: z.string().optional()`
- `src/types/cliente.ts`:
  - Adicionar `proveito_economico?: number`

**B) Visualizacao no projeto (Dados):**
- `src/components/CRM/ClienteDetails.tsx`:
  - Adicionar exibicao de CNH (ja tem, verificar visibilidade)
  - Adicionar exibicao de Proveito Economico
  - Mover esses campos para uma secao destacada "Dados Rapidos"

**C) Cards do Financeiro:**
- `src/pages/Financial.tsx`:
  - No card do cliente, adicionar CNH e Proveito Economico (se existirem)

**UI proposta no card:**
```text
+--------------------------------+
| Joao Silva         [Adimplente]|
| Contrato: R$ 15.000           |
| Parcela: R$ 1.250             |
| CNH: 12345678901              |  <-- NOVO
| Proveito: 25%                 |  <-- NOVO
+--------------------------------+
```

---

### Resumo de Arquivos

**Migrations SQL (criar):**
1. `fix_parcelas_datas_mensais.sql` - corrigir funcao de geracao
2. `add_valor_pago_coluna.sql` - adicionar coluna valor_pago
3. `add_proveito_economico.sql` - adicionar coluna proveito_economico

**Componentes a modificar:**
- `src/components/Financial/ClienteFinanceiroDialog.tsx`
- `src/components/Financial/BaixaPagamentoDialog.tsx`
- `src/components/CRM/ClienteForm.tsx`
- `src/components/CRM/ClienteDetails.tsx`
- `src/pages/Financial.tsx`

**Hooks a modificar:**
- `src/hooks/useClienteParcelas.ts`

**Types a modificar:**
- `src/types/cliente.ts`
- `src/types/financeiro.ts`

**Novos componentes:**
- `src/components/Financial/EditarPagamentoDialog.tsx`

---

### Secao Tecnica

**Funcao SQL corrigida para datas:**
```sql
CREATE OR REPLACE FUNCTION public.gerar_parcelas_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- variaveis existentes...
  dia_vencimento INTEGER;
  data_calc DATE;
BEGIN
  -- ... codigo existente para grupos_parcelas ...
  
  -- MODELO SIMPLES (corrigido)
  ELSIF NEW.forma_pagamento = 'parcelado' 
     AND NEW.numero_parcelas > 0 THEN
    
    IF NEW.data_vencimento_inicial IS NOT NULL THEN
      -- Extrair o dia do vencimento inicial
      dia_vencimento := EXTRACT(DAY FROM NEW.data_vencimento_inicial);
      
      FOR i IN 1..NEW.numero_parcelas LOOP
        -- Adicionar meses mantendo o mesmo dia
        data_calc := NEW.data_vencimento_inicial + ((i - 1) || ' months')::INTERVAL;
        
        INSERT INTO public.cliente_parcelas (
          cliente_id,
          numero_parcela,
          valor_parcela,
          data_vencimento,
          status,
          tenant_id
        ) VALUES (
          NEW.id,
          i,
          NEW.valor_parcela,
          data_calc,
          CASE WHEN data_calc < CURRENT_DATE THEN 'atrasado' ELSE 'pendente' END,
          NEW.tenant_id
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
```

**Calculo correto de totalPago:**
```typescript
const totalPago = parcelasPagas.reduce((acc, p) => {
  const valorEfetivamentePago = p.valor_pago ?? p.valor_parcela;
  return acc + Number(valorEfetivamentePago);
}, 0);
```

**Interface atualizada:**
```typescript
// src/types/financeiro.ts
export interface ClienteParcela {
  // ... campos existentes
  valor_pago?: number; // NOVO: valor efetivamente pago
}

// src/types/cliente.ts
export interface Cliente {
  // ... campos existentes
  proveito_economico?: number; // NOVO: percentual de proveito economico
}
```
