

## Adicionar campo "Observacao" em cada veiculo

### Resumo

Cada veiculo cadastrado passara a ter um campo de texto livre "Observacao". Esse campo sera salvo no JSONB `dados_veiculares` e exibido na tela de detalhes do cliente.

### Mudancas

**1. `src/types/cliente.ts` - Interface `Veiculo`**

Adicionar campo opcional `observacao?: string` na interface.

**2. `src/components/CRM/ClienteForm.tsx` - Formulario de veiculo**

- Adicionar um campo `Textarea` ou `Input` de observacao abaixo dos campos existentes (apos Placa), ocupando largura total (`col-span-2`)
- Atualizar o objeto inicial de novo veiculo para incluir `observacao: ''`
- Linha ~387: adicionar `observacao: ''` no onClick de "Adicionar veiculo"

**3. `src/components/CRM/ClienteDetails.tsx` - Exibicao dos dados**

- Na secao "Dados Veiculares", apos a InfoRow de "Placa", adicionar:
  ```
  <InfoRow label="Observacao" value={v.observacao} />
  ```

### Resumo por arquivo

| Arquivo | Mudanca |
|---|---|
| `src/types/cliente.ts` | Adicionar `observacao?: string` na interface `Veiculo` |
| `src/components/CRM/ClienteForm.tsx` | Campo textarea de observacao no formulario de cada veiculo + inicializacao |
| `src/components/CRM/ClienteDetails.tsx` | Exibir observacao na visualizacao de dados veiculares |

Nenhuma migration de banco e necessaria pois o campo e armazenado dentro do JSONB existente `dados_veiculares`.
