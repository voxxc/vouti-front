
# Implementacao de Juros/Multa, Edicao de Pagamentos e Etiquetas de Clientes

## Resumo das Funcionalidades

| Recurso | Status | Descricao |
|---------|--------|-----------|
| 1. Juros e Multa | NOVO | Checkbox com dropdown para configurar taxas de juros/multa por atraso |
| 2. Editar/Desfazer Pagamento | JA EXISTE | Menu de 3 pontinhos com "Editar Pagamento" e "Reabrir Pagamento" |
| 3. Etiquetas de Clientes | NOVO | Sistema de etiquetas (Trabalhista, Criminal, Bancario, etc.) |

---

## Funcionalidade 1: Juros e Multa Automaticos

### O que sera feito

Adicionar na secao de pagamento do cadastro de cliente:
- Checkbox "Aplicar Juros por Atraso"
- Dropdown com opcoes de percentual de juros (0,5%, 1%, 2%, 3% ao mes)
- Checkbox "Aplicar Multa por Atraso"  
- Dropdown com opcoes de percentual de multa (2%, 5%, 10% - valor fixo)

Quando uma parcela estiver atrasada, o sistema calculara automaticamente o valor atualizado.

### Alteracoes no Banco de Dados

Nova migration para adicionar colunas na tabela `clientes`:

```sql
ALTER TABLE clientes
ADD COLUMN aplicar_juros BOOLEAN DEFAULT FALSE,
ADD COLUMN taxa_juros_mensal NUMERIC(5,2) DEFAULT 0,
ADD COLUMN aplicar_multa BOOLEAN DEFAULT FALSE,
ADD COLUMN taxa_multa NUMERIC(5,2) DEFAULT 0;
```

### Alteracoes nos Arquivos

1. **src/types/cliente.ts** - Adicionar campos ao tipo Cliente
2. **src/lib/validations/cliente.ts** - Adicionar campos ao schema Zod
3. **src/components/CRM/ClienteForm.tsx** - Adicionar checkboxes e dropdowns na secao de pagamento
4. **src/components/Financial/ClienteFinanceiroDialog.tsx** - Calcular valor atualizado para parcelas atrasadas
5. **src/hooks/useClientes.ts** - Incluir novos campos no CRUD

### Logica de Calculo

```text
Valor Atualizado = Valor Original + Multa + Juros

Multa (fixa) = Valor Original * (taxa_multa / 100)
Juros (composto mensal) = Valor Original * ((1 + taxa_juros/100)^meses_atraso - 1)

Exemplo: Parcela de R$ 1.000 atrasada 2 meses
- Multa 2% = R$ 20
- Juros 1% ao mes = R$ 20,10
- Total = R$ 1.040,10
```

---

## Funcionalidade 2: Editar/Desfazer Pagamento

### Status: JA IMPLEMENTADO

O sistema ja possui esta funcionalidade em `src/components/Financial/ClienteFinanceiroDialog.tsx`:

- Menu de 3 pontinhos aparece para parcelas com status "pago"
- Opcao "Editar Pagamento" abre dialog para alterar data, metodo, valor e observacoes
- Opcao "Reabrir Pagamento" retorna a parcela para status "pendente" ou "atrasado"

O componente `EditarPagamentoDialog` ja existe e funciona corretamente.

**Nenhuma alteracao necessaria.**

---

## Funcionalidade 3: Etiquetas de Clientes

### O que sera feito

Adicionar sistema de etiquetas no cadastro de cliente para categorizar por area juridica:
- Trabalhista
- Criminal
- Bancario
- Rural
- Civel
- Previdenciario
- (outras criadas pelo usuario)

O usuario podera selecionar multiplas etiquetas e criar novas.

### Alteracoes no Banco de Dados

Ja existe a tabela `etiquetas`. Precisamos criar uma tabela de relacionamento:

```sql
CREATE TABLE cliente_etiquetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  etiqueta_id UUID NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, etiqueta_id)
);

-- RLS Policy
ALTER TABLE cliente_etiquetas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios podem ver etiquetas de seus clientes" ON cliente_etiquetas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM clientes c WHERE c.id = cliente_id AND c.user_id = auth.uid())
    OR tenant_id = get_user_tenant_id()
  );

-- Inserir etiquetas padrao para areas juridicas
INSERT INTO etiquetas (nome, cor, tenant_id) VALUES
  ('Trabalhista', '#3b82f6', NULL),
  ('Criminal', '#ef4444', NULL),
  ('Bancário', '#22c55e', NULL),
  ('Rural', '#84cc16', NULL),
  ('Cível', '#8b5cf6', NULL),
  ('Previdenciário', '#f59e0b', NULL),
  ('Tributário', '#06b6d4', NULL),
  ('Família', '#ec4899', NULL)
ON CONFLICT DO NOTHING;
```

### Alteracoes nos Arquivos

1. **src/components/CRM/ClienteEtiquetasManager.tsx** - Novo componente para gerenciar etiquetas do cliente
2. **src/components/CRM/ClienteForm.tsx** - Adicionar o componente de etiquetas no formulario
3. **src/types/cliente.ts** - Adicionar interface para ClienteEtiqueta
4. **src/hooks/useClienteEtiquetas.ts** - Novo hook para CRUD de etiquetas de clientes

---

## Secao Tecnica

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/CRM/ClienteEtiquetasManager.tsx` | Componente para selecionar/criar etiquetas |
| `src/hooks/useClienteEtiquetas.ts` | Hook para CRUD de etiquetas do cliente |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/types/cliente.ts` | Adicionar campos juros/multa e interface de etiquetas |
| `src/lib/validations/cliente.ts` | Adicionar campos juros/multa ao schema |
| `src/components/CRM/ClienteForm.tsx` | Adicionar checkboxes juros/multa e componente etiquetas |
| `src/components/Financial/ClienteFinanceiroDialog.tsx` | Calcular valor atualizado com juros/multa |

### Fluxo da Interface

```text
Cadastro de Cliente
     |
     +-- Secao Pagamento
     |      |
     |      +-- [x] Aplicar Juros por Atraso
     |      |      |
     |      |      +-- Dropdown: 0,5% | 1% | 2% | 3% ao mes
     |      |
     |      +-- [x] Aplicar Multa por Atraso
     |             |
     |             +-- Dropdown: 2% | 5% | 10%
     |
     +-- Secao Etiquetas (novo)
            |
            +-- [Trabalhista] [Criminal] [Bancario] [+Nova]
```

### Exibicao de Valor Atualizado

No dialog financeiro, parcelas atrasadas mostrarao:
- Valor Original: R$ 1.000,00
- Multa (2%): R$ 20,00
- Juros (1% x 2 meses): R$ 20,10
- **Valor Atualizado: R$ 1.040,10**

---

## Ordem de Implementacao

1. Migration do banco de dados (tabela cliente_etiquetas + colunas juros/multa)
2. Atualizar tipos TypeScript
3. Criar hook useClienteEtiquetas
4. Criar componente ClienteEtiquetasManager
5. Modificar ClienteForm para incluir juros/multa e etiquetas
6. Modificar ClienteFinanceiroDialog para calcular valores atualizados
7. Testes end-to-end
