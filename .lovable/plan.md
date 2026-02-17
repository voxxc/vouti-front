

## Adicionar seção "Veicular" com suporte a múltiplos veículos

### O que muda

Os campos CNH e Validade CNH deixam de ficar expostos diretamente no formulário e passam a ficar dentro de uma seção colapsável "Veicular" (checkbox). Ao marcar, aparecem os campos CNH, Validade CNH, RENAVAM e Placa, com botão "Adicionar veículo" para cadastrar múltiplos veículos. Os dados aparecem também na tela de detalhes do cliente e no dialog "Dados do Cliente" dentro do projeto.

---

### Mudanças no banco de dados

Criar uma nova coluna JSONB na tabela `clientes` para armazenar os veículos:

```text
ALTER TABLE clientes ADD COLUMN dados_veiculares jsonb DEFAULT NULL;
```

Estrutura do JSON:

```text
{
  "veiculos": [
    {
      "cnh": "12345678901",
      "cnh_validade": "2025-12-31",
      "renavam": "00000000000",
      "placa": "ABC1D23"
    },
    {
      "cnh": "98765432101",
      "cnh_validade": "2026-06-15",
      "renavam": "11111111111",
      "placa": "XYZ9K87"
    }
  ]
}
```

Os campos antigos `cnh` e `cnh_validade` permanecem no banco para compatibilidade, mas o formulário passa a usar a nova coluna.

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| **Migracao SQL** | Adicionar coluna `dados_veiculares jsonb` na tabela `clientes` |
| `src/types/cliente.ts` | Adicionar interface `Veiculo` e campo `dados_veiculares` no tipo `Cliente` |
| `src/lib/validations/cliente.ts` | Adicionar schema de validacao para `dados_veiculares` |
| `src/components/CRM/ClienteForm.tsx` | Remover campos CNH/Validade avulsos, adicionar checkbox "Veicular" com seção colapsável contendo lista de veículos com botão "Adicionar" |
| `src/components/CRM/ClienteDetails.tsx` | Exibir seção "Dados Veiculares" com cada veículo listado |
| `src/components/Project/ProjectClientDataDialog.tsx` | Dados veiculares já aparecem automaticamente via `ClienteDetails` |

---

### Detalhes técnicos

**1. Tipo (cliente.ts)**

```text
export interface Veiculo {
  cnh?: string;
  cnh_validade?: string;
  renavam?: string;
  placa?: string;
}

export interface DadosVeiculares {
  veiculos: Veiculo[];
}

// No Cliente:
dados_veiculares?: DadosVeiculares;
```

**2. Formulário (ClienteForm.tsx)**

- Remover os campos CNH e Validade CNH avulsos (linhas 287-310)
- Adicionar estado `veicularOpen` (boolean) e `veiculos` (array de Veiculo)
- Ao carregar cliente existente, popular `veiculos` a partir de `cliente.dados_veiculares?.veiculos` OU, para retrocompatibilidade, de `cliente.cnh` / `cliente.cnh_validade` se existirem
- Checkbox "Veicular" -- ao marcar, exibe a lista de veículos
- Cada veículo: 4 campos (CNH, Validade CNH, RENAVAM, Placa) com botão X para remover
- Botão "+ Adicionar veículo" no final
- No `onSubmit`, montar `dados_veiculares: { veiculos }` e também manter `cnh` / `cnh_validade` do primeiro veículo para compatibilidade

**3. Detalhes (ClienteDetails.tsx)**

Após a seção de documentos (CPF/CNPJ), adicionar:

```text
// Se tem dados veiculares
{cliente.dados_veiculares?.veiculos?.length > 0 && (
  <>
    <Separator />
    <div className="py-2">
      <span className="text-xs font-medium uppercase">Dados Veiculares</span>
    </div>
    {cliente.dados_veiculares.veiculos.map((v, i) => (
      <div key={i} className="ml-4 py-2 border-l-2 pl-4 mb-2">
        <InfoRow label="CNH" value={v.cnh} />
        <InfoRow label="Validade CNH" value={formatDate(v.cnh_validade)} />
        <InfoRow label="RENAVAM" value={v.renavam} />
        <InfoRow label="Placa" value={v.placa} />
      </div>
    ))}
  </>
)}
```

Se o cliente nao tem `dados_veiculares` mas tem `cnh` (dados antigos), manter o fallback atual exibindo CNH e Validade CNH avulsos.

---

### Resultado

- Formulário de cliente: checkbox "Veicular" revela campos CNH, Validade, RENAVAM e Placa
- Botão "Adicionar" permite múltiplos veículos
- Dados salvos como JSONB na coluna `dados_veiculares`
- Visualização do cliente e "Dados do Cliente" no projeto mostram todos os veículos cadastrados
- Retrocompatibilidade com clientes que já tem CNH/Validade nos campos antigos
