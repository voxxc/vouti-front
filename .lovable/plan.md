
Trocar o relatório do Banco de IDs de CSV para PDF.

### O que muda
- No `TenantBancoIdsDialog.tsx`, substituir a geração de CSV por PDF usando `jsPDF` + `jspdf-autotable` (já usados no projeto, ex: `DocumentosPDFExport.tsx`).
- Manter o mesmo botão "Baixar Relatório" no mesmo lugar.

### Conteúdo do PDF
- Cabeçalho: "Banco de IDs — {tenantName}"
- Subtítulo: data/hora de geração + total de IDs
- Tabela única com colunas:
  - Tipo (OAB, Processo, Tracking, Request Busca, Request Detalhes, Request Tracking)
  - Descrição
  - CNJ / Documento
  - ID Externo (Request/Tracking)
  - Referência ID
  - Tribunal
  - Criado em
- Ordenação: por tipo, depois por data
- Rodapé com numeração de páginas
- Orientação: paisagem (landscape) para caber as colunas largas
- Fonte pequena (8-9pt) para IDs caberem sem quebrar

### Detalhe técnico
- `jspdf-autotable` cuida de paginação e quebra de linhas automaticamente
- Nome do arquivo: `banco-ids-{tenant-slug}-{YYYY-MM-DD}.pdf`
- Remover toda a lógica de CSV (`escapeCsv`, montagem de string, BOM)

### Arquivo
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx`

### Validação
- Abrir Banco de IDs do tenant cordeiro
- Clicar em "Baixar Relatório"
- Confirmar que abre PDF com todos os IDs paginados e legíveis
