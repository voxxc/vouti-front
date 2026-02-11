

## Nova aba "Controle" no Extras com dados da planilha

### Resumo

Adicionar uma nova aba chamada **Controle** dentro do modulo Extras (tanto no drawer quanto na pagina). Essa aba exibira uma tabela replicando a planilha CONTROLE2025, com todos os dados ja inseridos para o tenant `/demorais`.

---

### 1. Banco de dados

**Nova tabela: `controle_clientes`**

Colunas mapeadas da planilha:
- `id` (uuid, PK)
- `tenant_id` (uuid, FK tenants, NOT NULL)
- `cliente` (text) -- nome do cliente
- `placa` (text)
- `renavam` (text)
- `cnh` (text)
- `cpf_cnpj` (text)
- `validade_cnh` (date)
- `proximo_prazo` (text) -- texto livre pois tem valores variados
- `obs` (text)
- `ultima_consulta` (date)
- `created_at`, `updated_at` (timestamps)

**RLS**: Isolamento por tenant (`tenant_id = get_user_tenant_id()`) para SELECT, INSERT, UPDATE, DELETE.

**Dados**: Inserir os ~80 registros validos da planilha para o tenant `d395b3a1-1ea1-4710-bcc1-ff5f6a279750` (demorais).

---

### 2. Novo componente: `src/components/Extras/ControleTab.tsx`

- Busca dados de `controle_clientes` filtrado por `tenant_id` (via `useTenantId`)
- Exibe tabela usando componentes `Table` do shadcn/ui
- Colunas: Cliente, Placa, Renavam, CNH, CPF/CNPJ, Validade CNH, Proximo Prazo, OBS, Ultima Consulta
- Campo de busca para filtrar por nome do cliente
- Coluna "tempo sem consultar" calculada dinamicamente (diferenca entre hoje e ultima_consulta)
- Scroll horizontal para caber todas as colunas

---

### 3. Alteracoes em arquivos existentes

**`src/components/Extras/ExtrasDrawer.tsx`**
- Adicionar `'controle'` ao tipo `TabType`
- Adicionar botao de tab "Controle" (visivel apenas para admin)
- Renderizar `<ControleTab />` quando ativo

**`src/pages/Extras.tsx`**
- Mesmas alteracoes: novo tab type, botao, renderizacao

---

### Arquivos afetados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabela + RLS + insert dados |
| `src/components/Extras/ControleTab.tsx` | Novo |
| `src/components/Extras/ExtrasDrawer.tsx` | Modificar (add tab) |
| `src/pages/Extras.tsx` | Modificar (add tab) |

