

## Duas mudancas: estado financeiro pos-criacao + cards de parcela mais compactos

### 1. Cards de parcela mais compactos (`ParcelaCard.tsx`)

O layout atual usa `flex-1 min-w-[100px]` e `flex-1 min-w-[90px]` nas colunas, o que espalha os dados por toda a largura do card. A mudanca remove o `flex-1` e reduz os `min-w` para que valor, vencimento, detalhes e os 3 pontos fiquem lado a lado de forma compacta.

**Mudancas no layout:**

| Elemento | Antes | Depois |
|---|---|---|
| Numero + Status | `min-w-[100px]` | `min-w-[80px]` |
| Valor | `flex-1 min-w-[100px]` | sem flex-1, sem min-w |
| Vencimento | `flex-1 min-w-[90px]` | sem flex-1, sem min-w |
| Pago em | `flex-1 min-w-[90px]` | sem flex-1, sem min-w |
| Saldo Aberto | `flex-1 min-w-[90px]` | sem flex-1, sem min-w |
| Gap geral | `gap-3` | `gap-2` |
| Acoes | `ml-auto` | `ml-auto` (mantem) |

Isso faz todos os dados ficarem proximos uns dos outros no lado esquerdo, e os botoes de acao no lado direito.

### 2. Permitir alterar dados financeiros de cliente ja criado

O trigger `gerar_parcelas_cliente` no banco ja regenera todas as parcelas quando o cliente e atualizado (faz DELETE + INSERT). Portanto, editar os campos financeiros no formulario de edicao ja funciona tecnicamente.

A mudanca aqui e de UX: adicionar um aviso claro no formulario de edicao informando que alterar dados financeiros ira regenerar o historico de parcelas.

**`src/components/CRM/ClienteForm.tsx`:**

- Na secao de contrato/pagamento, quando em modo edicao (`isEditing`), exibir um alerta informativo:
  > "Alterar os dados de pagamento ira regenerar todas as parcelas. Parcelas ja pagas perderao o historico."
- Isso aparece como um banner `bg-amber-500/10 border-amber-500` com icone de alerta

### Resumo por arquivo

| Arquivo | Mudanca |
|---|---|
| `src/components/Financial/ParcelaCard.tsx` | Remover `flex-1` e reduzir `min-w` das colunas, diminuir gap para layout mais compacto |
| `src/components/CRM/ClienteForm.tsx` | Adicionar alerta informativo na secao financeira quando em modo edicao |

