

# Restringir dados financeiros do cliente no Planejador por role

## Problema
Ao visualizar dados cadastrais de um cliente vinculado a uma tarefa no Planejador, todos os usuários veem informações financeiras (valor do contrato, forma de pagamento, parcelas, vendedor). Apenas admin deveria ver esses dados.

## Solução

### 1. Adicionar prop `hideFinancialData` ao `ClienteDetails` (`src/components/CRM/ClienteDetails.tsx`)

- Nova prop opcional `hideFinancialData?: boolean`
- Quando `true`, ocultar a seção "Contrato" inteira (linhas 166-203): data de fechamento, valor do contrato, forma de pagamento, parcelas, valor entrada, vendedor

### 2. Passar a prop no `PlanejadorTaskDetail` (`src/components/Planejador/PlanejadorTaskDetail.tsx`)

- Usar `useAuth()` que já está importado para obter `userRole`
- Na linha 974 onde renderiza `<ClienteDetails>`, passar `hideFinancialData={userRole !== 'admin'}`

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/CRM/ClienteDetails.tsx` | Adicionar prop `hideFinancialData`, condicionar seção Contrato |
| `src/components/Planejador/PlanejadorTaskDetail.tsx` | Passar `hideFinancialData` baseado no `userRole` |

