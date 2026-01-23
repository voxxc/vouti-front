

## Correção da Busca Geral no Super Admin

### Diagnóstico Confirmado

Analisei a documentação oficial da API Judit e encontrei os seguintes problemas:

| Problema | Atual | Correto |
|----------|-------|---------|
| Endpoint | `requests.prod.judit.io/requests` | `lawsuits.prod.judit.io/requests/create` |
| Parâmetro | Não envia `response_type` | Precisa `response_type: 'entity'` |
| Polling URL | `requests.prod.judit.io/responses` | `lawsuits.prod.judit.io/responses` |

**Por que não aparece CPF/cidade nas buscas por nome:**
- A API retorna `main_document` mas o frontend espera `document`
- A API retorna `contacts[].contact_type` mas o frontend espera `contacts[].type`
- Sem o `response_type: 'entity'`, a API não retorna dados cadastrais completos

---

### Alterações Planejadas

#### 1. Corrigir Edge Function

Arquivo: `supabase/functions/judit-buscar-dados-cadastrais/index.ts`

Mudanças:
- Endpoint: `https://lawsuits.prod.judit.io/requests/create`
- Adicionar `response_type: 'entity'` no payload
- Polling URL: `https://lawsuits.prod.judit.io/responses`
- Adicionar logs para debug dos dados retornados

#### 2. Adicionar Função de Normalização no Frontend

Arquivo: `src/components/SuperAdmin/SuperAdminBuscaGeral.tsx`

Criar função para mapear campos da API Judit para estrutura esperada:

| Campo API Judit | Campo Frontend |
|-----------------|----------------|
| `main_document` | `document` |
| `entity_type` | `type` |
| `parents[kinship='mother'].name` | `mother_name` |
| `parents[kinship='father'].name` | `father_name` |
| `contacts[].contact_type` | `contacts[].type` |
| `contacts[].description` | `contacts[].value` |
| `social_name` | `trading_name` |
| `legal_nature.name` | `legal_nature` |
| `branch_activities` | `economic_activities` |
| `branch_activities[].name` | `economic_activities[].description` |
| `branch_activities[].main_activity` | `economic_activities[].is_main` |
| `partners[].position` | `partners[].qualification` |

#### 3. Criar Tabela de Histórico

Nova migração SQL para armazenar buscas anteriores:

```text
busca_cadastral_historico
├── id (uuid, PK)
├── search_type (text: 'cpf' | 'cnpj' | 'name')
├── search_key_display (text: valor mascarado)
├── search_key_hash (text: hash para detectar duplicatas)
├── resultado (jsonb: dados retornados)
├── total_resultados (integer)
├── request_id (text: ID da Judit)
├── user_id (uuid: quem fez a busca)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

RLS: apenas super_admins podem ler/escrever

#### 4. Adicionar Aba de Histórico na Interface

Reorganizar componente com tabs:

```text
┌──────────────────────────────────────────────────────────┐
│  Busca Geral                                              │
├──────────────────────────────────────────────────────────┤
│  [Nova Busca]  [Histórico (12)]                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Lista de buscas anteriores:                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ CPF  ●  João da Silva           23/01/2026 14:30    │ │
│  │         091.632.***-**          [Ver] [Atualizar]   │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Nome ●  Maria Santos           22/01/2026 10:15     │ │
│  │         5 resultados           [Ver] [Atualizar]    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

#### 5. Criar Hook para Histórico

Arquivo: `src/hooks/useBuscaCadastralHistorico.ts`

Funções:
- `fetchHistorico()` - listar buscas anteriores
- `salvarBusca(search, results)` - salvar nova busca
- `atualizarBusca(id, results)` - atualizar busca existente

---

### Arquivos a Modificar/Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/functions/judit-buscar-dados-cadastrais/index.ts` | Modificar | Corrigir endpoint e adicionar response_type |
| `supabase/migrations/xxx_create_busca_cadastral_historico.sql` | Criar | Tabela de histórico |
| `src/components/SuperAdmin/SuperAdminBuscaGeral.tsx` | Modificar | Normalização de dados + tabs + histórico |
| `src/hooks/useBuscaCadastralHistorico.ts` | Criar | Hook para gerenciar histórico |

---

### Resultado Esperado

Após as correções:

1. **Busca por CPF** retornará: nome, documento completo, data nascimento, filiação (mãe/pai), endereços com cidade/UF, contatos (telefone/email), nacionalidade, gênero

2. **Busca por CNPJ** retornará: razão social, nome fantasia, CNPJ, capital social, natureza jurídica, sócios, atividades econômicas (CNAE), endereços, contatos

3. **Busca por Nome** retornará: lista de pessoas/empresas com **documento completo (CPF/CNPJ)**, data nascimento, cidade, e ao clicar pode ver detalhes completos

4. **Histórico** permitirá: ver buscas anteriores, re-consultar para dados atualizados, filtrar por tipo

