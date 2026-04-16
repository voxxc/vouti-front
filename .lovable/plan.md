

## Plano: Inserir request_detalhes faltantes no Banco de IDs + botão de download de relatório

### Situação atual
- O tenant cordeiro tem **58 processos** cadastrados (39 com `detalhes_request_id`, 19 sem).
- Na tabela `tenant_banco_ids`, já existem **85 registros de tipo "processo"** e **42 de tipo "request_detalhes"**.
- Faltam **4 processos** com `detalhes_request_id` que não têm registro correspondente no banco de IDs:
  - `0007787-93.2023.8.16.0021` → `c166f5b1-...`
  - `0011615-17.2024.8.16.0003` → `3a06e9ea-...`
  - `0011615-17.2024.8.16.0004` → `d9ed10ec-...`
  - `5099572-24.2025.8.24.0000` → `fe687d40-...`

### O que vou fazer

**1. Inserir os 4 registros faltantes no `tenant_banco_ids`**
- Inserir via SQL (migration ou psql) as 4 entradas de tipo `request_detalhes` que estão faltando, com os dados corretos de `referencia_id`, `external_id` e `descricao`.

**2. Adicionar botão "Baixar Relatório" no `TenantBancoIdsDialog.tsx`**
- Ao lado do botão "Atualizar", adicionar um botão com ícone `Download` para exportar CSV/PDF.
- O relatório conterá: nº do processo (CNJ), tipo do registro, ID externo (request_id / tracking_id), descrição e data.
- Formato: CSV (mais prático para 50+ linhas), com todas as abas consolidadas ou filtrado pela aba ativa.
- Gerado no navegador via `Blob` + download, sem necessidade de backend.

### Arquivos alterados
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` — botão de download + lógica de exportação CSV
- SQL insert para os 4 registros faltantes

### Validação
- Abrir Banco de IDs do tenant cordeiro e confirmar que a aba Requests mostra 46 itens (42 + 4)
- Clicar em "Baixar Relatório" e verificar o CSV gerado com todos os processos e request IDs

