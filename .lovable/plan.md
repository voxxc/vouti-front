
O usuário quer um relatório PDF mais enxuto, contendo APENAS:
- Número do processo (CNJ)
- Request ID (que é o `external_id` dos registros tipo `request_detalhes`)

Hoje o relatório exporta todos os tipos (oab, processo, tracking, request_busca, request_detalhes, request_tracking) com 7 colunas, o que polui a visão.

### O que vou mudar em `TenantBancoIdsDialog.tsx` → `handleDownloadReport`

1. **Filtrar apenas registros `tipo = 'request_detalhes'`** (são esses que têm o Request ID de detalhes do processo, ex: `7c0d7c86-...`).
2. **Reduzir para 2 colunas**: `Processo (CNJ)` e `Request ID`.
3. **Extrair o CNJ** de `metadata.numero_cnj` (já vem populado pelo trigger `registrar_banco_id_processo`).
4. **Ordenar por CNJ** (alfabético) para facilitar leitura.
5. **Manter** cabeçalho com nome do tenant, data de geração e total.
6. **Orientação retrato** (portrait) — agora só tem 2 colunas, não precisa landscape.
7. **Nome do arquivo**: `request-ids-{tenant-slug}-{YYYY-MM-DD}.pdf`.

### Layout do PDF
```
Request IDs de Processos — cordeiro
Gerado em 16/04/2026 às 18:30  •  Total: 42 Request IDs

┌──────────────────────────────┬──────────────────────────────────────────┐
│ Processo (CNJ)               │ Request ID                               │
├──────────────────────────────┼──────────────────────────────────────────┤
│ 0035150-55.2023.8.16.0021    │ 7c0d7c86-81fa-4212-9900-170a34f6b02f     │
│ 0007787-93.2023.8.16.0021    │ c166f5b1-...                             │
│ ...                          │ ...                                      │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### Arquivo afetado
- `src/components/SuperAdmin/TenantBancoIdsDialog.tsx` (apenas a função `handleDownloadReport`)

### Validação
- Abrir Banco de IDs do tenant cordeiro → clicar "Baixar Relatório"
- Confirmar que o PDF tem só 2 colunas (CNJ + Request ID)
- Confirmar que o processo `0035150-55.2023.8.16.0021` aparece com o request id `7c0d7c86-81fa-4212-9900-170a34f6b02f`
