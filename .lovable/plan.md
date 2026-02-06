
# Excluir Pagamento do Histórico

## Resumo
Adicionar botão de lixeira ao lado de cada registro de pagamento no histórico de detalhes da parcela, permitindo excluir pagamentos feitos com dupla confirmação.

---

## Entendimento Atual

O sistema armazena pagamentos de duas formas:
1. **Na parcela** (`cliente_parcelas`): campos `valor_pago`, `saldo_restante`, `status`, `data_pagamento`, `metodo_pagamento`
2. **No histórico** (`cliente_pagamento_comentarios`): registro textual de cada pagamento

### Tipos de registros no histórico:
- `pagamento` - pagamento total
- `pagamento_parcial` - pagamento parcial com saldo restante
- `reabertura` - quando a parcela foi reaberta
- `comentario` - comentário manual do usuário

---

## O que será implementado

### 1. Botão de Lixeira no Histórico

Adicionar ícone de lixeira apenas para itens do tipo `pagamento` ou `pagamento_parcial`:

```text
┌──────────────────────────────────────────────────────────┐
│ 15/01/2026 às 14:30                          João Silva │
│ Pagamento parcial de R$ 500,00 via PIX.      [🗑️]       │
│ Saldo restante: R$ 1.000,00                             │
└──────────────────────────────────────────────────────────┘
```

### 2. Dupla Confirmação

AlertDialog com aviso claro:

```text
+---------------------------------------------+
| ⚠️ Excluir Registro de Pagamento            |
+---------------------------------------------+
| Tem certeza que deseja excluir este         |
| registro de pagamento?                       |
|                                             |
| ⚠️ IMPORTANTE:                              |
| Esta ação removerá o registro do histórico  |
| e ajustará o saldo da parcela.              |
|                                             |
| [Cancelar]         [Sim, Excluir Pagamento] |
+---------------------------------------------+
```

### 3. Lógica de Exclusão

Ao excluir um pagamento, o sistema deve:
1. Extrair o valor pago do texto do comentário (usando regex)
2. Subtrair esse valor do `valor_pago` total da parcela
3. Recalcular o `saldo_restante`
4. Atualizar o `status` da parcela:
   - Se `valor_pago` voltar a 0 → `pendente` ou `atrasado` (conforme vencimento)
   - Se `valor_pago` > 0 mas < valor_parcela → `parcial`
5. Deletar o registro do histórico
6. Registrar comentário automático: "Pagamento de R$ X excluído"

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Financial/ParcelaHistorico.tsx` | Adicionar botão lixeira + AlertDialog de confirmação + prop callback |
| `src/hooks/useClienteParcelas.ts` | Adicionar função `excluirPagamento()` |
| `src/components/Financial/DividaContent.tsx` | Passar callbacks para ParcelaHistorico |
| `src/components/Financial/ClienteFinanceiroDialog.tsx` | Passar callbacks para ParcelaHistorico |

---

## ParcelaHistorico - Alterações

```tsx
interface ParcelaHistoricoProps {
  parcelaId: string;
  onExcluirPagamento?: (historicoId: string, valorPago: number) => Promise<void>;
}

// No card de cada item de pagamento:
{(item.tipo === 'pagamento' || item.tipo === 'pagamento_parcial') && onExcluirPagamento && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3 w-3" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>⚠️ Excluir Registro de Pagamento</AlertDialogTitle>
        <AlertDialogDescription>
          Tem certeza que deseja excluir este registro de pagamento?
          Esta ação removerá o registro do histórico e ajustará o saldo da parcela.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={() => handleExcluir(item)}>
          Sim, Excluir Pagamento
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

---

## Hook useClienteParcelas - Nova Função

```tsx
const excluirPagamento = async (
  parcelaId: string, 
  historicoId: string, 
  valorPagamento: number
) => {
  try {
    // Buscar parcela atual
    const parcela = parcelas.find(p => p.id === parcelaId);
    if (!parcela) throw new Error('Parcela não encontrada');

    const valorPagoAtual = parcela.valor_pago || 0;
    const novoValorPago = Math.max(0, valorPagoAtual - valorPagamento);
    const novoSaldoRestante = parcela.valor_parcela - novoValorPago;

    // Determinar novo status
    let novoStatus: string;
    if (novoValorPago <= 0) {
      novoStatus = new Date(parcela.data_vencimento) < new Date() ? 'atrasado' : 'pendente';
    } else {
      novoStatus = 'parcial';
    }

    // Atualizar parcela
    const { error: updateError } = await supabase
      .from('cliente_parcelas')
      .update({
        valor_pago: novoValorPago > 0 ? novoValorPago : null,
        saldo_restante: novoSaldoRestante,
        status: novoStatus,
        // Se voltou a pendente, limpar dados de pagamento
        ...(novoValorPago <= 0 && {
          data_pagamento: null,
          metodo_pagamento: null,
        })
      })
      .eq('id', parcelaId);

    if (updateError) throw updateError;

    // Deletar registro do histórico
    const { error: deleteError } = await supabase
      .from('cliente_pagamento_comentarios')
      .delete()
      .eq('id', historicoId);

    if (deleteError) throw deleteError;

    // Registrar exclusão no histórico
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('cliente_pagamento_comentarios')
        .insert({
          parcela_id: parcelaId,
          user_id: user.id,
          comentario: `Pagamento de R$ ${valorPagamento.toFixed(2)} excluído`,
          tenant_id: tenantId
        });
    }

    toast({ title: 'Pagamento excluído' });
    await fetchParcelas();
    return true;
  } catch (error) {
    toast({ title: 'Erro ao excluir', variant: 'destructive' });
    return false;
  }
};
```

---

## Extração de Valor do Comentário

Função helper para extrair o valor do texto do comentário:

```tsx
const extrairValorDoComentario = (comentario: string): number => {
  // Padrões: "R$ 500,00", "R$ 1.500,00"
  const match = comentario.match(/R\$\s*([\d.,]+)/);
  if (match) {
    const valorStr = match[1].replace('.', '').replace(',', '.');
    return parseFloat(valorStr) || 0;
  }
  return 0;
};
```

---

## Fluxo Completo

1. Usuário clica em "Detalhes" na parcela
2. Vê o histórico de pagamentos
3. Clica na lixeira ao lado de um pagamento
4. AlertDialog pede confirmação dupla
5. Ao confirmar:
   - Valor é subtraído do total pago
   - Saldo restante é recalculado
   - Status é atualizado
   - Registro é deletado do histórico
   - Novo registro de exclusão é adicionado
6. Lista atualiza automaticamente

---

## Detalhes Técnicos

- A lixeira só aparece para itens do tipo `pagamento` ou `pagamento_parcial`
- Comentários manuais NÃO podem ser excluídos por essa funcionalidade
- O registro de exclusão serve como auditoria
- Se múltiplos pagamentos parciais existem, cada um pode ser excluído individualmente
