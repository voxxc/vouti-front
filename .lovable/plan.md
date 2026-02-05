
# Corrigir Erro de Atualização de Cliente

## Problema Identificado

Os logs do banco de dados mostram o erro exato:

```
invalid input syntax for type date: ""
```

O PostgreSQL está rejeitando strings vazias `""` para campos do tipo `date`. Quando o usuário deixa um campo de data vazio, o formulário envia uma string vazia ao invés de `null`.

## Causa Raiz

No arquivo `src/components/CRM/ClienteForm.tsx`, a função `onSubmit` não converte strings vazias em `undefined` para todos os campos de data:

```typescript
// Problema: não trata string vazia
data_vencimento_inicial: !usarGruposParcelas ? data.data_vencimento_inicial : undefined,
data_vencimento_final: !usarGruposParcelas ? data.data_vencimento_final : undefined,
```

Quando `usarGruposParcelas` é `false`, o código passa `data.data_vencimento_inicial` diretamente, que pode ser `""`.

## Solução

Modificar a função `onSubmit` para garantir que **todos os campos de data** sejam convertidos para `undefined` quando estiverem vazios.

---

## Alteracoes Tecnicas

### Arquivo: src/components/CRM/ClienteForm.tsx

Atualizar a construcao do objeto `clienteData` na funcao `onSubmit` (linhas 115-148):

```typescript
const clienteData: Partial<Cliente> = {
  nome_pessoa_fisica: data.nome_pessoa_fisica || undefined,
  nome_pessoa_juridica: data.nome_pessoa_juridica || undefined,
  cpf: data.cpf || undefined,
  cnpj: data.cnpj || undefined,
  cnh: data.cnh || undefined,
  cnh_validade: data.cnh_validade || undefined, // String vazia -> undefined
  telefone: data.telefone || undefined,
  email: data.email || undefined,
  data_nascimento: data.data_nascimento || undefined, // String vazia -> undefined
  endereco: data.endereco || undefined,
  profissao: data.profissao || undefined,
  uf: data.uf || undefined,
  data_fechamento: data.data_fechamento || undefined, // String vazia -> undefined
  valor_contrato: data.valor_contrato ? parseFloat(data.valor_contrato) : undefined,
  forma_pagamento: data.forma_pagamento || undefined,
  // CORRECAO: Adicionar || undefined para converter string vazia
  valor_entrada: !usarGruposParcelas && data.valor_entrada ? parseFloat(data.valor_entrada) : undefined,
  numero_parcelas: !usarGruposParcelas && data.numero_parcelas ? parseInt(data.numero_parcelas) : undefined,
  valor_parcela: !usarGruposParcelas && data.valor_parcela ? parseFloat(data.valor_parcela) : undefined,
  data_vencimento_inicial: !usarGruposParcelas && data.data_vencimento_inicial ? data.data_vencimento_inicial : undefined,
  data_vencimento_final: !usarGruposParcelas && data.data_vencimento_final ? data.data_vencimento_final : undefined,
  vendedor: data.vendedor || undefined,
  origem_rede_social: data.origem_rede_social || undefined,
  origem_tipo: data.origem_tipo || undefined,
  observacoes: data.observacoes || undefined,
  classificacao: data.classificacao,
  status_cliente: data.status_cliente || 'ativo',
  pessoas_adicionais: pessoasAdicionais.filter(p => 
    p.nome_pessoa_fisica || p.nome_pessoa_juridica
  ),
  grupos_parcelas: usarGruposParcelas ? gruposParcelas : undefined,
  proveito_economico: data.proveito_economico ? parseFloat(data.proveito_economico) : undefined,
};
```

As alteracoes principais sao nas linhas de datas condicionais:

**Antes:**
```typescript
data_vencimento_inicial: !usarGruposParcelas ? data.data_vencimento_inicial : undefined,
data_vencimento_final: !usarGruposParcelas ? data.data_vencimento_final : undefined,
```

**Depois:**
```typescript
data_vencimento_inicial: !usarGruposParcelas && data.data_vencimento_inicial ? data.data_vencimento_inicial : undefined,
data_vencimento_final: !usarGruposParcelas && data.data_vencimento_final ? data.data_vencimento_final : undefined,
```

---

## Arquivo a Editar

- `src/components/CRM/ClienteForm.tsx`

## Resultado Esperado

1. Campos de data vazios serao convertidos para `null` no banco de dados
2. A atualizacao de clientes funcionara corretamente mesmo com campos de data vazios
3. Nao havera mais erros de "invalid input syntax for type date"
