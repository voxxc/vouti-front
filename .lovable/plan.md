# Cadastro de Cliente com Dropdown: "Comum" vs "Formulário (Ficha Cadastral)"

## Causa raiz / motivação
Hoje o `/:tenant/clientes/novo` abre direto o `ClienteForm` (cadastro comum). Para Solvenza, é necessário um cadastro mais completo no molde da Ficha Cadastral (.xlsx enviada), com clientes secundários, contas bancárias contratadas, dívidas e dados do contrato — e poder exportar tudo em `.xlsx`.

## Correção (UX)

Na tela **Novo Cliente** (`ClienteCadastro.tsx`), antes de mostrar o formulário, exibir um seletor de tipo:

```text
┌──────────────────────────────────────────┐
│ Como deseja cadastrar?                   │
│ [ Comum ▼ ]                              │
│   • Comum — cadastro padrão (existente)  │
│   • Formulário — Ficha Cadastral completa│
└──────────────────────────────────────────┘
```

- **Comum** → mantém exatamente o fluxo atual (`ClienteForm`).
- **Formulário** → abre o wizard "Ficha Cadastral" (multi-etapa, baseado no XLSX).

Edição de cliente existente: se o cliente foi criado via Ficha, abre direto a Ficha; caso contrário, fluxo comum (com botão "Migrar para Ficha Cadastral" opcional — fica para depois).

## Wizard da Ficha Cadastral (4 passos)

1. **Dados do contrato**: forma de captação, consultor, advogado responsável, datas (fechamento, pagamento entrada), responsável financeiro, serviços contratados, checklist Sim/Não/Obs (procurações, execução, citação, leilão, avalistas, alienação), observação geral e situações urgentes.
2. **Cliente principal + outros clientes** (lista dinâmica): nome, CPF, RG, estado civil, profissão, telefone, e-mail, endereço, "responsável pelo contrato".
3. **Contas contratadas** (lista dinâmica): titular, banco, ag/cc.
4. **Resumo de endividamento** (lista dinâmica, 2ª aba do XLSX): banco, ag/cc, titular, anos de movimentação, valor da dívida, situação das parcelas, bens em garantia, avalistas, observação.

Validação com `zod` (CPF, e-mail, valores). Auto-save de rascunho em `localStorage` por usuário.

Ao concluir:
- Cria/atualiza o `clientes` (cliente principal) com os campos compatíveis (nome, CPF, telefone, e-mail, endereço) — reaproveita o cadastro existente para não duplicar.
- Salva o restante (clientes secundários, contas, dívidas, checklist, datas, etc.) na nova tabela `clientes_ficha_cadastral` ligada ao `cliente_id`.
- Botão **"Exportar XLSX"** gera o arquivo no layout original (2 abas: `DADOS PRINCIPAIS`, `RESUMO ENDIVIDAMENTO`).

## Arquivos afetados

- `src/pages/ClienteCadastro.tsx` — adicionar dropdown e roteamento condicional para o wizard.
- `src/components/CRM/FichaCadastral/` (novo)
  - `FichaCadastralWizard.tsx`
  - `Steps/DadosContratoStep.tsx`
  - `Steps/ClientesStep.tsx`
  - `Steps/ContasStep.tsx`
  - `Steps/DividasStep.tsx`
  - `Steps/RevisaoStep.tsx`
- `src/lib/fichaCadastral/schema.ts` — zod + tipos.
- `src/lib/fichaCadastral/exportXlsx.ts` — geração `.xlsx` com `exceljs` (lazy import).
- `src/hooks/useFichaCadastral.ts` — CRUD da ficha.
- Migration: tabela `public.clientes_ficha_cadastral` (tenant-isolada, RLS por `has_role_in_tenant`).
- Dependência: `exceljs`.

## Modelo de dados (resumo)

```text
clientes_ficha_cadastral
  id, tenant_id, cliente_id (FK clientes), created_by,
  dados_contrato jsonb,  -- captação, consultor, datas, checklists, observação
  outros_clientes jsonb, -- array de clientes secundários
  contas jsonb,          -- array {titular, banco, ag_cc}
  dividas jsonb,         -- array de itens do resumo de endividamento
  created_at, updated_at
```

RLS: `SELECT/INSERT/UPDATE/DELETE` apenas para usuários com role no `tenant_id`. GRANTs para `authenticated` e `service_role`.

## Impacto

- **Usuário final (Solvenza):** ao clicar "Novo Cliente" agora escolhe entre **Comum** (igual hoje) ou **Formulário** (wizard novo de 4 passos com export `.xlsx`). Quem só usa o cadastro comum não sente diferença — o dropdown vem pré-selecionado em "Comum". A lista de clientes continua igual; clientes salvos via Ficha mostram um badge "Ficha completa" e abrem direto no wizard.
- **Dados:** nova tabela `clientes_ficha_cadastral` (1:1 com `clientes`). Sem migrar dados antigos. `payload jsonb` mantém os dados ricos sem inflar `clientes`. Sem impacto em performance (tabela nova, indexada por `cliente_id` e `tenant_id`).
- **Riscos colaterais:** baixos. Nada muda em processos, financeiro, projetos. Único ponto de atenção: a criação de projeto que hoje acontece no `handleFormSuccess` precisa funcionar igual após o wizard (vou reaproveitar a mesma lógica).
- **Quem é afetado:** todos os usuários de todos os tenants veem o dropdown (não é restrito ao Solvenza). Se preferir limitar ao Solvenza, basta gatilho por slug do tenant — me diga.

## Validação

- Cadastro **Comum** funciona idêntico ao atual (criar/editar/excluir cliente).
- Wizard **Formulário** salva cliente principal em `clientes` + ficha em `clientes_ficha_cadastral`.
- Reabrir cliente criado via Ficha → wizard pré-preenchido em todos os passos.
- Botão "Exportar XLSX" baixa arquivo com 2 abas e rótulos exatamente nas posições da planilha original.
- RLS: ficha criada no tenant A não aparece no tenant B.
- Sem regressão na criação automática de projeto vinculado.

## Perguntas rápidas

1. Dropdown disponível para **todos os tenants** ou só para **Solvenza**?
2. Em "Editar cliente": clientes antigos (sem ficha) devem ter botão **"Migrar para Ficha Cadastral"** ou deixo essa migração para depois?
3. Quem pode usar o tipo **Formulário**: todos os papéis com acesso ao CRM, ou restringir (ex.: admin/comercial/advogado)?
