
# Menu de 3 Pontinhos para Todas as Parcelas

## Resumo
Adicionar menu de ações (3 pontinhos) em todas as parcelas do financeiro, não apenas nas parcelas pagas. Este menu permitirá:
- Editar dados da parcela (valor, vencimento)
- Editar dados do pagamento (para pagas/parciais)
- Reabrir parcela (para pagas)
- Dar baixa (para pendentes/atrasadas/parciais)

---

## Estado Atual

O sistema JÁ possui:
- Menu de 3 pontinhos APENAS para parcelas `pago`
- `EditarPagamentoDialog` que edita data_pagamento, metodo, valor_pago
- `reabrirParcela()` que reseta a parcela para pendente
- Registro de pagamentos parciais com `valor_pago` e `saldo_restante`
- Histórico de pagamentos na aba "Histórico"

---

## O que será implementado

### 1. Menu de 3 pontinhos em TODAS as parcelas

```text
Parcela Pendente/Atrasada:
┌────────────────────────────┐
│ ⋮  [Dar Baixa]             │
├────────────────────────────┤
│ [✏️] Editar Parcela        │
└────────────────────────────┘

Parcela Parcial:
┌────────────────────────────┐
│ ⋮  [Completar Pagamento]   │
├────────────────────────────┤
│ [✏️] Editar Parcela        │
│ [📝] Editar Pagamento      │
└────────────────────────────┘

Parcela Paga:
┌────────────────────────────┐
│ ⋮                          │
├────────────────────────────┤
│ [✏️] Editar Parcela        │
│ [📝] Editar Pagamento      │
│ [🔄] Reabrir Pagamento     │
└────────────────────────────┘
```

### 2. Novo Dialog: Editar Parcela

Campos editáveis:
- **Número da parcela** - opcional
- **Valor da parcela** - número
- **Data de vencimento** - date picker
- **Descrição/Grupo** - texto (grupo_descricao)

### 3. Atualizar EditarPagamentoDialog

Adicionar campos para:
- Data do pagamento (já existe)
- Valor pago (já existe)
- Método de pagamento (já existe)
- Observações (já existe)

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/Financial/EditarParcelaDialog.tsx` | Dialog para editar dados da parcela (valor, vencimento) |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Financial/ClienteFinanceiroDialog.tsx` | Adicionar menu 3 pontinhos em todas as parcelas + lógica para novo dialog |
| `src/hooks/useClienteParcelas.ts` | Adicionar função `editarParcela()` para atualizar valor/vencimento |

---

## Novo Componente: EditarParcelaDialog

```tsx
interface EditarParcelaDialogProps {
  parcela: ClienteParcela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Campos editáveis:
- numero_parcela (number)
- valor_parcela (number)
- data_vencimento (date)
- grupo_descricao (text)
```

---

## Visual do Dialog "Editar Parcela"

```text
+----------------------------------------+
| Editar Parcela #3                      |
+----------------------------------------+
| Número da Parcela                      |
| [3                                 ]   |
|                                        |
| Valor da Parcela                       |
| [R$ 1.500,00                       ]   |
|                                        |
| Data de Vencimento                     |
| [15/03/2026                        ]   |
|                                        |
| Grupo/Descrição                        |
| [Parcelas de Honorários            ]   |
|                                        |
| [Cancelar]         [Salvar Alterações] |
+----------------------------------------+
```

---

## Lógica do Menu de 3 Pontinhos

```tsx
// Para TODAS as parcelas, sempre mostrar o menu
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    
    {/* Dar baixa - para pendente, atrasado, parcial */}
    {(parcela.status === 'pendente' || 
      parcela.status === 'atrasado' || 
      parcela.status === 'parcial') && (
      <DropdownMenuItem onClick={() => handleDarBaixa(parcela)}>
        <DollarSign className="h-4 w-4 mr-2" />
        {parcela.status === 'parcial' ? 'Completar Pagamento' : 'Dar Baixa'}
      </DropdownMenuItem>
    )}
    
    {/* Editar parcela - sempre disponível */}
    <DropdownMenuItem onClick={() => handleEditarParcelaDados(parcela)}>
      <Edit className="h-4 w-4 mr-2" />
      Editar Parcela
    </DropdownMenuItem>
    
    {/* Editar pagamento - para pago e parcial */}
    {(parcela.status === 'pago' || parcela.status === 'parcial') && (
      <DropdownMenuItem onClick={() => handleEditarParcela(parcela)}>
        <FileText className="h-4 w-4 mr-2" />
        Editar Pagamento
      </DropdownMenuItem>
    )}
    
    {/* Reabrir - apenas para pago */}
    {parcela.status === 'pago' && (
      <DropdownMenuItem 
        onClick={() => handleReabrirParcela(parcela.id)}
        className="text-destructive"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reabrir Pagamento
      </DropdownMenuItem>
    )}
    
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Hook useClienteParcelas - Nova Função

```tsx
const editarParcela = async (
  parcelaId: string, 
  dados: { 
    numero_parcela?: number;
    valor_parcela?: number;
    data_vencimento?: string;
    grupo_descricao?: string;
  }
) => {
  try {
    const { error } = await supabase
      .from('cliente_parcelas')
      .update({
        ...dados,
        // Recalcular status se data de vencimento mudou
        status: dados.data_vencimento && 
                new Date(dados.data_vencimento) < new Date() ? 
                'atrasado' : undefined
      })
      .eq('id', parcelaId);

    if (error) throw error;

    // Registrar no histórico
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('cliente_pagamento_comentarios')
        .insert({
          parcela_id: parcelaId,
          user_id: user.id,
          comentario: `Parcela editada: ${JSON.stringify(dados)}`,
          tenant_id: tenantId
        });
    }

    toast({ title: 'Parcela atualizada' });
    await fetchParcelas();
    return true;
  } catch (error) {
    toast({ title: 'Erro', variant: 'destructive' });
    return false;
  }
};
```

---

## Resumo das Ações por Status

| Status | Dar Baixa | Editar Parcela | Editar Pagamento | Reabrir | Histórico |
|--------|-----------|----------------|------------------|---------|-----------|
| pendente | ✅ | ✅ | ❌ | ❌ | ❌ |
| atrasado | ✅ | ✅ | ❌ | ❌ | ❌ |
| parcial | ✅ (Completar) | ✅ | ✅ | ❌ | ✅ |
| pago | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## Registro no Histórico

Quando uma parcela for editada, será registrado automaticamente:
- "Parcela editada: valor alterado de R$ 1.000 para R$ 1.500"
- "Parcela editada: vencimento alterado para 15/03/2026"

Isso permite auditoria completa de todas as mudanças.

---

## Fluxo Completo

1. Usuário clica nos 3 pontinhos de qualquer parcela
2. Menu dropdown aparece com opções disponíveis
3. **Editar Parcela**: Abre dialog para editar valor/vencimento
4. **Editar Pagamento**: Abre dialog para editar dados do pagamento
5. **Dar Baixa/Completar**: Abre dialog de baixa existente
6. **Reabrir**: Confirma e reseta a parcela para pendente
7. Todas as ações são registradas no histórico da parcela

---

## Detalhes Técnicos

- O botão de "Dar Baixa" que atualmente aparece ao lado do menu será removido para parcelas pagas (já que fica redundante)
- O menu de 3 pontinhos será o ponto central de todas as ações
- Os botões "Histórico" e "Comentários" continuam como botões separados por serem ações de visualização
