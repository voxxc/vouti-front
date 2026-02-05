

# Flexibilizar Cadastro de Cliente e Adicionar Validade de CNH

## Resumo do Problema

1. **Muitos campos obrigatórios** no cadastro de cliente dificultam o uso
2. **Não existe campo de validade da CNH** no sistema
3. **Validade da CNH não aparece** quando projeto é vinculado ao cliente

## Solução Proposta

### Parte 1: Remover Obrigatoriedades Excessivas

Atualmente, os campos obrigatórios são:
- Data de fechamento (**obrigatório**)
- Valor do contrato (**obrigatório**)
- Forma de pagamento (**obrigatório**)
- Classificação PF/PJ (**obrigatório**)
- Ao menos um nome (PF ou PJ) (**obrigatório**)

Campos que ficarão **opcionais**:
- Data de fechamento
- Valor do contrato
- Forma de pagamento
- Classificação (terá valor padrão "pf")

O único campo que permanecerá obrigatório será **ao menos um nome** (PF ou PJ).

### Parte 2: Adicionar Campo de Validade da CNH

- Novo campo no banco de dados: `cnh_validade` (tipo `date`)
- Campo no formulário de cadastro/edição
- Exibição no componente de detalhes do cliente

### Parte 3: Exibir Validade da CNH nos Dados do Projeto

Quando um cliente for vinculado a um projeto, a validade da CNH aparecerá junto com os demais dados.

---

## Alteracoes Tecnicas

### 1. Migracao do Banco de Dados

Adicionar coluna `cnh_validade` na tabela `clientes`:

```sql
ALTER TABLE clientes
ADD COLUMN cnh_validade date;

COMMENT ON COLUMN clientes.cnh_validade IS 'Data de validade da CNH do cliente';
```

Tornar campos antes obrigatorios em opcionais:

```sql
ALTER TABLE clientes 
ALTER COLUMN data_fechamento DROP NOT NULL,
ALTER COLUMN valor_contrato DROP NOT NULL,
ALTER COLUMN forma_pagamento DROP NOT NULL;
```

### 2. src/lib/validations/cliente.ts

Remover obrigatoriedades e adicionar campo cnh_validade:

```typescript
export const clienteSchema = z.object({
  nome_pessoa_fisica: z.string().optional(),
  nome_pessoa_juridica: z.string().optional(),
  cpf: z.string().optional().refine(...),
  cnpj: z.string().optional().refine(...),
  cnh: z.string().optional(),
  cnh_validade: z.string().optional(), // NOVO CAMPO
  telefone: z.string().optional(), // Remover min(10)
  email: z.string().email('Email invalido').optional().or(z.literal('')),
  data_nascimento: z.string().optional().or(z.literal('')),
  endereco: z.string().optional(),
  profissao: z.string().optional(),
  uf: z.string().optional().or(z.literal('')), // Remover length(2)
  data_fechamento: z.string().optional(), // Antes: obrigatorio
  valor_contrato: z.string().optional(), // Antes: obrigatorio
  forma_pagamento: z.enum(['a_vista', 'parcelado']).optional(), // Antes: obrigatorio
  // ... demais campos continuam opcionais
  classificacao: z.enum(['pf', 'pj']).default('pf').optional(), // Valor padrao 'pf'
  // ...
}).refine(
  (data) => data.nome_pessoa_fisica || data.nome_pessoa_juridica,
  {
    message: 'Informe ao menos um nome (Pessoa Fisica ou Pessoa Juridica)',
    path: ['nome_pessoa_fisica'],
  }
);
// Remover refinements de parcelas obrigatorias
```

### 3. src/types/cliente.ts

Adicionar campo e tornar campos opcionais:

```typescript
export interface Cliente {
  id: string;
  user_id: string;
  nome_pessoa_fisica?: string;
  nome_pessoa_juridica?: string;
  cpf?: string;
  cnpj?: string;
  cnh?: string;
  cnh_validade?: string; // NOVO CAMPO
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  endereco?: string;
  profissao?: string;
  uf?: string;
  data_fechamento?: string; // Agora opcional
  data_cadastro?: string;
  valor_contrato?: number; // Agora opcional
  forma_pagamento?: 'a_vista' | 'parcelado'; // Agora opcional
  // ... restante igual
}
```

### 4. src/components/CRM/ClienteForm.tsx

Adicionar campo de validade da CNH no formulario:

```tsx
{/* CNH - opcional */}
<div className="space-y-2">
  <Label htmlFor="cnh">
    CNH <span className="text-xs text-muted-foreground">(opcional)</span>
  </Label>
  <Input 
    id="cnh" 
    {...register('cnh')} 
    placeholder="00000000000"
    maxLength={11}
  />
</div>

{/* NOVO: Validade CNH */}
<div className="space-y-2">
  <Label htmlFor="cnh_validade">
    Validade CNH <span className="text-xs text-muted-foreground">(opcional)</span>
  </Label>
  <Input 
    id="cnh_validade" 
    type="date"
    {...register('cnh_validade')} 
  />
</div>
```

Atualizar defaultValues e onSubmit para incluir cnh_validade.

### 5. src/components/CRM/ClienteDetails.tsx

Exibir validade da CNH quando disponivel:

```tsx
{cliente.cnh && (
  <div>
    <p className="text-sm text-muted-foreground">CNH</p>
    <p className="font-medium">{cliente.cnh}</p>
  </div>
)}

{/* NOVO: Validade CNH */}
{cliente.cnh_validade && (
  <div>
    <p className="text-sm text-muted-foreground">Validade CNH</p>
    <p className="font-medium">
      {format(new Date(cliente.cnh_validade), 'dd/MM/yyyy', { locale: ptBR })}
    </p>
  </div>
)}
```

---

## Arquivos a Editar

1. **Migracao SQL** - Adicionar coluna e remover NOT NULL constraints
2. `src/lib/validations/cliente.ts` - Remover obrigatoriedades, adicionar cnh_validade
3. `src/types/cliente.ts` - Adicionar cnh_validade, tornar campos opcionais
4. `src/components/CRM/ClienteForm.tsx` - Adicionar campo de validade CNH
5. `src/components/CRM/ClienteDetails.tsx` - Exibir validade da CNH

## Resultado Esperado

1. Cadastro de cliente exige apenas **um nome** (PF ou PJ) - todos os demais campos sao opcionais
2. Novo campo **Validade CNH** disponivel no cadastro
3. Ao vincular cliente a projeto, a **validade da CNH aparece** nos dados do cliente

