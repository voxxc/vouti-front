

# Lista Minimalista de Clientes no Financeiro

## Problema Atual

A lista de clientes no Financeiro usa **Cards** com:
- Nome + Badge de status
- Valor do contrato
- Próximo vencimento
- Dias em atraso
- Botão "Ver Detalhes"

## Solucao Proposta

Lista simples com apenas **nomes clicaveis**, seguindo o mesmo padrao minimalista do CRM.

---

## Layout Antes vs Depois

**Antes (Cards):**
```text
┌──────────────────────────────────────┐
│ João da Silva          [Adimplente]  │
│ 💲 R$ 5.000,00                       │
│ 📅 Próximo: 15/02/2026               │
│ [Ver Detalhes]                       │
└──────────────────────────────────────┘
```

**Depois (Lista simples):**
```text
João da Silva                    Adimplente
Maria Santos                     Inadimplente
Pedro Oliveira                   Encerrado
```

Onde cada nome e clicavel e leva aos detalhes.

---

## Estrutura da Lista

```text
┌─────────────────────────────────────────────────────────┐
│  Clientes   Colaboradores   Custos         Métricas    │
│  ─────────                                              │
│                                                         │
│  🔍 Pesquisar...                    [Filtrar ▾]        │
│                                                         │
│  João da Silva                        Adimplente       │
│  Maria Santos                         Inadimplente     │
│  Pedro Oliveira                       Encerrado        │
│  Ana Costa                            Adimplente       │
│                                                         │
│  4 clientes encontrados                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Alteracoes no FinancialContent.tsx

### Remover
- Cards com CardHeader/CardContent
- Icones DollarSign, Calendar, AlertTriangle na lista
- Informacoes de valor, vencimento, dias em atraso
- Botao "Ver Detalhes"

### Adicionar
- Lista simples com divs
- Nome clicavel (text-primary hover:underline)
- Badge de status discreto a direita

---

## Codigo da Nova Lista

```typescript
{clientesFiltrados.length === 0 ? (
  <div className="py-8 text-center">
    <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
    <p className="text-muted-foreground">
      {searchTerm || statusFilter !== 'todos' 
        ? 'Nenhum cliente encontrado'
        : 'Nenhum cliente cadastrado'}
    </p>
  </div>
) : (
  <div className="space-y-1">
    {clientesFiltrados.map((cliente) => {
      const statusConfig = getStatusBadge(cliente.status);
      return (
        <div 
          key={cliente.id} 
          className="flex items-center justify-between py-2 px-1 hover:bg-muted/50 rounded transition-colors"
        >
          <button
            onClick={() => onViewCliente?.(cliente)}
            className="text-sm font-medium text-primary hover:underline text-left"
          >
            {getNomeCliente(cliente)}
          </button>
          <Badge variant={statusConfig.variant} className="text-xs">
            {statusConfig.label}
          </Badge>
        </div>
      );
    })}
  </div>
)}
```

---

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/Financial/FinancialContent.tsx` | Substituir grid de Cards por lista simples com nomes clicaveis |

---

## Beneficios

- **Super minimalista**: Apenas nome e status
- **Scan rapido**: Facil de percorrer a lista visualmente
- **Consistente**: Mesmo padrao da lista de clientes do CRM
- **Menos ruido**: Informacoes detalhadas so aparecem ao clicar
- **Performance**: Menos elementos DOM por cliente

