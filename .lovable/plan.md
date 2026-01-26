# Plano de Desenvolvimento

Este arquivo é usado para documentar planos de implementação de funcionalidades.

## Status: Completo

A funcionalidade de **Pagamento Parcial com Saldo em Aberto** foi implementada com sucesso.

### Resumo das Alterações

1. ✅ Migration: Adicionada coluna `saldo_restante` na tabela `cliente_parcelas`
2. ✅ Types: Adicionado status `'parcial'` e campos `saldo_restante` e `pagamento_parcial`
3. ✅ BaixaPagamentoDialog: Checkbox "Pagamento Parcial" com alerta visual do saldo restante
4. ✅ useClienteParcelas: Lógica para definir status `'parcial'` e calcular `saldo_restante`
5. ✅ ClienteFinanceiroDialog: Badge amarelo para parciais + exibição do saldo em aberto + botão "Completar Pagamento"
6. ✅ Financial.tsx: Cálculos do dashboard ajustados para considerar parcelas parciais
