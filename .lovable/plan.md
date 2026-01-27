

## Correção do Pagamento Parcial + Badge + Aba de Histórico

### Problema Identificado

O erro ocorre porque existe uma **constraint CHECK** no banco de dados que só permite estes valores para o campo `status`:
```sql
CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text, 'atrasado'::text])))
```

Quando o código tenta salvar o status como `'parcial'`, o banco rejeita com o erro:
```
"new row for relation \"cliente_parcelas\" violates check constraint \"cliente_parcelas_status_check\""
```

---

### Solução em 3 Partes

#### Parte 1: Corrigir a Constraint no Banco

Criar uma migration SQL para atualizar a constraint e incluir 'parcial':

```sql
-- Remover constraint antiga
ALTER TABLE cliente_parcelas 
DROP CONSTRAINT IF EXISTS cliente_parcelas_status_check;

-- Criar nova constraint incluindo 'parcial'
ALTER TABLE cliente_parcelas 
ADD CONSTRAINT cliente_parcelas_status_check 
CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'atrasado'::text, 'parcial'::text]));
```

---

#### Parte 2: Badge de "Parcial" no Card do Cliente

Adicionar um indicador visual no card do cliente (Financial.tsx) quando houver parcelas com status 'parcial':

**Visual proposto:**
```
┌─────────────────────────────────────┐
│ João Silva           [Adimplente]  │
│                                     │
│ ⚠️ 2 parcelas com saldo em aberto  │  ← BADGE NOVO
│                                     │
│ Contrato: R$ 15.000                │
│ Parcela: R$ 1.250                  │
│ Parcelas: 8/12 pagas               │
│                                     │
│ [Ver Detalhes Financeiros]         │
└─────────────────────────────────────┘
```

**Implementação:**
```typescript
// Contar parcelas parciais
const parcelasParciais = parcelas.filter(p => p.status === 'parcial');
const saldoParcialTotal = parcelasParciais.reduce(
  (acc, p) => acc + (p.saldo_restante || 0), 0
);

// Renderizar badge se houver parcelas parciais
{parcelasParciais.length > 0 && (
  <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded border border-amber-500/20">
    <AlertTriangle className="h-4 w-4 text-amber-600" />
    <span className="text-xs text-amber-700 font-medium">
      {parcelasParciais.length} parcela(s) com saldo em aberto
      ({formatCurrency(saldoParcialTotal)})
    </span>
  </div>
)}
```

---

#### Parte 3: Aba de Histórico na Parcela

Adicionar uma seção de histórico quando o usuário abre os detalhes de uma parcela paga ou parcial. O histórico virá dos comentários automáticos que já são salvos.

**Visual proposto:**
```
┌────────────────────────────────────────────────────┐
│ Parcela #3        [Pago ✓]              [...]     │
├────────────────────────────────────────────────────┤
│ [Detalhes]  [Histórico]                           │
├────────────────────────────────────────────────────┤
│                                                    │
│ 📅 26/01/2026 14:30                               │
│    ✓ Pagamento registrado via PIX                 │
│    Valor: R$ 1.500,00                             │
│                                                    │
│ 📅 25/01/2026 10:15                               │
│    ⚠ Pagamento parcial de R$ 1.000,00 via PIX    │
│    Saldo restante: R$ 500,00                      │
│                                                    │
│ 📅 20/01/2026 09:00                               │
│    🔄 Pagamento reaberto para correção            │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Implementação:**

1. **Criar componente `ParcelaHistorico.tsx`** que busca os comentários automáticos da parcela e exibe em formato de timeline.

2. **Modificar a exibição da parcela** no `ClienteFinanceiroDialog.tsx`:
   - Usar Tabs (Detalhes | Histórico) quando parcela está paga ou parcial
   - Mostrar timeline de eventos com ícones diferenciados

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Atualizar constraint para incluir 'parcial' |
| `src/pages/Financial.tsx` | Adicionar badge de parcelas parciais no card |
| `src/components/Financial/ClienteFinanceiroDialog.tsx` | Adicionar tabs (Detalhes/Histórico) nas parcelas pagas |
| `src/components/Financial/ParcelaHistorico.tsx` | **NOVO** - Componente de timeline de histórico |

---

### Sugestões para Deixar Visualmente Bonito

1. **Badge no Card**:
   - Usar cores âmbar/laranja para indicar atenção sem alarmar
   - Ícone de triângulo com exclamação (AlertTriangle)
   - Fundo semi-transparente com borda sutil
   - Mostrar valor total em aberto

2. **Timeline de Histórico**:
   - Linha vertical conectando os eventos
   - Ícones diferentes por tipo de ação:
     - ✓ Verde para pagamento completo
     - ⚠️ Âmbar para pagamento parcial
     - 🔄 Azul para reabertura
   - Data e hora em formato legível
   - Valores monetários destacados
   - Animação suave ao expandir

3. **Tabs na Parcela**:
   - Transição suave entre abas
   - Indicador visual de qual aba está ativa
   - Contador de eventos no histórico ("Histórico (3)")

---

### Seção Técnica

**Migration SQL:**
```sql
-- Atualizar CHECK constraint para incluir 'parcial'
ALTER TABLE cliente_parcelas 
DROP CONSTRAINT IF EXISTS cliente_parcelas_status_check;

ALTER TABLE cliente_parcelas 
ADD CONSTRAINT cliente_parcelas_status_check 
CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'atrasado'::text, 'parcial'::text]));
```

**Estrutura do ParcelaHistorico:**
```typescript
interface HistoricoItem {
  id: string;
  data: string;
  tipo: 'pagamento' | 'pagamento_parcial' | 'reabertura' | 'comentario';
  descricao: string;
  valor?: number;
  autor?: string;
}

// Timeline visual
<div className="relative pl-6 border-l-2 border-muted space-y-4">
  {historico.map((item) => (
    <div key={item.id} className="relative">
      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary" />
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{formatDate(item.data)}</p>
        <p className="text-sm">{item.descricao}</p>
      </div>
    </div>
  ))}
</div>
```

**Badge no Card (Financial.tsx):**
```typescript
{(() => {
  const parcelas = parcelasPorClienteState[cliente.id] || [];
  const parcelasParciais = parcelas.filter(p => p.status === 'parcial');
  const saldoTotal = parcelasParciais.reduce((acc, p) => acc + Number(p.saldo_restante || 0), 0);
  
  if (parcelasParciais.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/30">
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <div className="text-xs">
        <span className="font-medium text-amber-700">
          {parcelasParciais.length} parcela(s) com saldo
        </span>
        <span className="text-amber-600 ml-1">
          ({formatCurrency(saldoTotal)} em aberto)
        </span>
      </div>
    </div>
  );
})()}
```

