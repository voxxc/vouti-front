

## Publicacoes - Monitoramento de Diarios Oficiais

### Visao Geral

Novo modulo "Publicacoes" com 3 frentes:
1. **Sidebar**: Novo botao "Publicacoes" no DashboardSidebar que abre um drawer com a lista de publicacoes encontradas
2. **Extras > Publicacoes**: Aba de configuracao para cadastrar nomes/OABs a monitorar, com visualizacao dos diarios monitorados
3. **Edge Function + Cron**: Busca automatica diaria as 8h no portal `comunica.pje.jus.br` via scraping com Firecrawl

---

### 1. Database - Novas Tabelas

**`publicacoes_monitoramentos`** - Cadastro de nomes para monitoramento (configuracao em Extras)

| Coluna | Tipo | Descricao |
|---|---|---|
| id | UUID PK | - |
| tenant_id | UUID FK | Isolamento multi-tenant |
| tipo | TEXT | 'PF' ou 'PJ' |
| nome | TEXT | Nome completo para busca |
| oab_numero | TEXT | Numero da OAB |
| oab_uf | TEXT | UF da OAB |
| cpf | TEXT | CPF (opcional) |
| abrangencia | TEXT | 'todos', 'um_estado', 'diferentes_estados' |
| estados_selecionados | JSONB | Lista de estados se nao for 'todos' |
| quem_recebe_user_id | UUID FK | Usuario que recebe as publicacoes |
| status | TEXT | 'ativo' / 'inativo' |
| tribunais_monitorados | JSONB | Lista completa de siglas por estado |
| data_inicio_monitoramento | DATE | A partir de quando monitorar |
| created_at | TIMESTAMPTZ | - |
| updated_at | TIMESTAMPTZ | - |

**`publicacoes`** - Publicacoes encontradas

| Coluna | Tipo | Descricao |
|---|---|---|
| id | UUID PK | - |
| tenant_id | UUID FK | - |
| monitoramento_id | UUID FK | Ref ao monitoramento que gerou |
| data_disponibilizacao | DATE | Data da publicacao |
| data_publicacao | DATE | Quando foi publicada |
| tipo | TEXT | Tipo de comunicacao |
| numero_processo | TEXT | Numero do processo |
| diario_sigla | TEXT | Ex: TJPRDJN |
| diario_nome | TEXT | Ex: 18a Camara Civel |
| comarca | TEXT | Curitiba, etc |
| nome_pesquisado | TEXT | Nome que gerou o match |
| conteudo_completo | TEXT | Texto integral da publicacao |
| link_acesso | TEXT | URL para acessar publicacao |
| status | TEXT | 'nao_tratada', 'tratada', 'descartada' |
| orgao | TEXT | Orgao/vara |
| responsavel | TEXT | Advogado responsavel |
| partes | TEXT | Partes do processo |
| created_at | TIMESTAMPTZ | - |
| updated_at | TIMESTAMPTZ | - |

RLS com `tenant_id = get_user_tenant_id()` para ambas as tabelas.

---

### 2. Sidebar - Botao Publicacoes

**Arquivo**: `src/components/Dashboard/DashboardSidebar.tsx`

- Adicionar `'publicacoes'` ao tipo `ActiveDrawer`
- Novo item no `menuItems`: `{ id: 'publicacoes', icon: Newspaper, label: 'Publicacoes', route: '/publicacoes' }`
- Acesso: admin + controller
- Adicionar ao `drawerItems`

**Arquivo**: `src/components/Dashboard/DashboardLayout.tsx`

- Importar e renderizar `PublicacoesDrawer`

---

### 3. Drawer de Publicacoes (Sidebar)

**Novo arquivo**: `src/components/Publicacoes/PublicacoesDrawer.tsx`

Drawer no padrao inset com:
- Header "Publicacoes"
- Contadores no topo: "X Nao tratadas hoje", "X Tratadas hoje", "X Descartadas hoje", "X Nao tratadas (total)"
- Filtros: busca por texto, estado, status
- Lista de publicacoes em cards compactos mostrando:
  - Data disponibilizacao
  - Tipo
  - Numero do processo (clicavel)
  - Diario + Orgao/Comarca
  - Nome pesquisado
  - Status (badge colorido)
  - Botoes: marcar tratada, descartar, acessar publicacao

**Novo arquivo**: `src/components/Publicacoes/PublicacaoDetalhe.tsx`

Tela de detalhe ao clicar na publicacao (navegacao interna no drawer):
- Lado esquerdo: conteudo completo da publicacao (texto do diario)
- Lado direito: dados do processo (numero, partes, responsavel, historico)
- Botoes: Voltar, Tratamentos, Descartar, Concluir
- Status badge no topo

---

### 4. Extras > Aba Publicacoes (Configuracao)

**Novo arquivo**: `src/components/Extras/PublicacoesTab.tsx`

Aba dentro do ExtrasDrawer com:
- Tabela de monitoramentos cadastrados (Tipo, Nome, Diario de Justica, Quem recebe, Status, link "Visualizar diarios monitorados")
- Botao "Adicionar Monitoramento" que abre dialog com formulario:
  - Radio: Pessoa Fisica / Pessoa Juridica
  - Nome para pesquisar
  - OAB (numero + UF)
  - CPF (opcional)
  - Abrangencia: Todos os diarios / Um estado / Diferentes estados
  - Quem recebe (select de usuarios do tenant)
- Dialog "Diarios Monitorados" expandivel por estado mostrando todas as siglas
- Acoes: editar, excluir, ativar/desativar monitoramento

**Arquivo**: `src/components/Extras/ExtrasDrawer.tsx`

- Adicionar tab "Publicacoes" (somente admin)

---

### 5. Edge Function - Busca de Publicacoes

**Novo arquivo**: `supabase/functions/buscar-publicacoes-pje/index.ts`

A funcao:
1. Recebe `monitoramento_id` (ou processa todos os ativos)
2. Para cada monitoramento, monta as URLs do `comunica.pje.jus.br/consulta` com os parametros:
   - `siglaTribunal`: cada sigla dos diarios monitorados
   - `dataDisponibilizacaoInicio` / `dataDisponibilizacaoFim`: data de hoje (ou range)
   - `numeroOab` + `ufOab`: dados do monitoramento
3. Usa **Firecrawl** para scraping da pagina (que e uma SPA com JS)
4. Extrai as publicacoes do HTML/markdown retornado
5. Insere novas publicacoes na tabela `publicacoes` (evita duplicatas por numero_processo + data + diario)
6. Retorna resumo

Nota: Como o site `comunica.pje.jus.br` e uma SPA e nao foi possivel scrape-lo diretamente, sera necessario usar Firecrawl com `waitFor` para aguardar o carregamento do JS. A Edge Function processara os tribunais em lotes para evitar timeout.

---

### 6. Cron - Polling Diario as 8h

Usando `pg_cron` + `pg_net`, agendar chamada diaria a edge function:

```sql
SELECT cron.schedule(
  'buscar-publicacoes-diario',
  '0 11 * * *',  -- 8h BRT = 11h UTC
  $$
  SELECT net.http_post(
    url := 'https://ietjmyrelhijxyozcequ.supabase.co/functions/v1/buscar-publicacoes-pje',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ANON_KEY"}'::jsonb,
    body := '{"mode":"cron"}'::jsonb
  ) as request_id;
  $$
);
```

---

### 7. Dados Estaticos - Tribunais por Estado

Sera criado um arquivo `src/data/tribunaisPorEstado.ts` com o mapeamento completo de todas as siglas de tribunais por estado (conforme fornecido pelo usuario). Este dado sera usado tanto no formulario de cadastro quanto na edge function para determinar quais URLs consultar.

---

### Resumo de Arquivos

| Arquivo | Tipo | Descricao |
|---|---|---|
| Migracao SQL | DB | Tabelas `publicacoes_monitoramentos` e `publicacoes` + RLS |
| `src/data/tribunaisPorEstado.ts` | Novo | Mapeamento de tribunais por estado |
| `src/components/Dashboard/DashboardSidebar.tsx` | Editar | Novo item "Publicacoes" |
| `src/components/Dashboard/DashboardLayout.tsx` | Editar | Renderizar PublicacoesDrawer |
| `src/components/Publicacoes/PublicacoesDrawer.tsx` | Novo | Drawer principal com lista de publicacoes |
| `src/components/Publicacoes/PublicacaoDetalhe.tsx` | Novo | Tela de detalhe da publicacao |
| `src/components/Extras/PublicacoesTab.tsx` | Novo | Aba de configuracao de monitoramentos |
| `src/components/Extras/ExtrasDrawer.tsx` | Editar | Adicionar aba Publicacoes |
| `supabase/functions/buscar-publicacoes-pje/index.ts` | Novo | Edge function de scraping |
| SQL (pg_cron) | Inserir | Agendamento diario as 8h |

### Dependencia

Sera necessario ter o conector **Firecrawl** ativo para o scraping funcionar, pois o site `comunica.pje.jus.br` e uma SPA que requer renderizacao de JavaScript.

