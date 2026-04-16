

## Plano: Relatório PDF dos processos em segredo de justiça do tenant cordeiro

### Diagnóstico real
- A consulta correta deve incluir 4 critérios (não só `secrecy_level >= 1`):
  - `capa_completa.secrecy_level >= 1`
  - `detalhes_completos.secrecy_level >= 1`
  - `parte_ativa` contém "sigilo" / "segredo" / "dados indisponíveis"
  - `capa_completa.sigilo = true`
- Resultado real: **26 processos** no tenant cordeiro (não 6).
- A aba "Banco de IDs" no Super Admin **já lista** automaticamente todos os `detalhes_request_id` na sub-aba "Requests" (44 itens visíveis na sua print) — está sendo populada corretamente pelo trigger `registrar_banco_id_processo`. **Nada precisa ser atualizado lá**.

### O que vou entregar
1. **Listagem completa dos 26 processos** com CNJ + `detalhes_request_id` ao lado, agrupados em:
   - Sigilosos confirmados (`secrecy_level >= 1`): 5 processos
   - Sem dados / sigilo presumido (`parte_ativa` com marcação): 21 processos
2. **Relatório PDF** salvo em `/mnt/documents/processos-sigilo-cordeiro.pdf` contendo:
   - Cabeçalho: "Processos em Segredo de Justiça — Tenant: cordeiro"
   - Data de geração
   - Tabela com colunas: # / CNJ / Partes / Tribunal / Nível Sigilo / Detalhes Request ID / Monitoramento
   - Total ao final
   - Identidade visual sóbria (preto/branco para impressão)

### Como vou gerar o PDF
- Script Python com `reportlab` (já disponível no sandbox)
- Dados via `psql` (mesma query que validei)
- QA: converter PDF para imagem e inspecionar todas as páginas antes de entregar

### Arquivos
- Apenas saída: `/mnt/documents/processos-sigilo-cordeiro.pdf`
- Nenhuma alteração de código no projeto

### Validação
- Verificar que aparecem os 26 processos
- Verificar que cada linha tem o `detalhes_request_id` correto
- Verificar que o PDF abre, está paginado e legível

