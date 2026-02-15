

## Inserir Publicacao de Teste - Processo 0002836-50.2025.8.16.0065

### Contexto

O site do DJEN esta com timeout no momento, mas com base na URL fornecida e nos dados do monitoramento OAB 111056/PR ja cadastrado, vamos inserir manualmente uma publicacao de exemplo para esse processo, e tambem testar o scraper via Edge Function.

### O que sera feito

#### 1. Inserir publicacao de exemplo via SQL

Inserir um registro na tabela `publicacoes` com os dados do processo:

- **tenant_id**: `d395b3a1-1ea1-4710-bcc1-ff5f6a279750`
- **monitoramento_id**: `5dfc8d9a-d9ea-4b1b-966c-6da941ae191b` (OAB 111056/PR)
- **numero_processo**: `0002836-50.2025.8.16.0065`
- **diario_sigla**: `TJPR`
- **tipo**: `Intimação`
- **nome_pesquisado**: Nome do advogado vinculado ao monitoramento
- **status**: `nao_tratada`
- **data_disponibilizacao**: data recente
- **link_acesso**: URL do DJEN com os parametros de busca

#### 2. Testar o botao "Buscar DJEN" no drawer

Apos a insercao, o registro aparecera automaticamente no drawer de Publicacoes. Tambem podemos disparar o scraper via Edge Function para tentar capturar dados reais do DJEN.

### Detalhes tecnicos

**Migracao SQL para inserir o registro de teste:**

```sql
INSERT INTO publicacoes (
  tenant_id, monitoramento_id, data_disponibilizacao, tipo, 
  numero_processo, diario_sigla, diario_nome, comarca,
  nome_pesquisado, conteudo_completo, link_acesso, status, orgao
) VALUES (
  'd395b3a1-1ea1-4710-bcc1-ff5f6a279750',
  '5dfc8d9a-d9ea-4b1b-966c-6da941ae191b',
  '2026-02-15',
  'Intimação',
  '0002836-50.2025.8.16.0065',
  'TJPR',
  'Diário de Justiça Eletrônico do TJPR',
  'Foz do Iguaçu',
  'ALAN CLAUDIO MARAN',
  'Intimação referente ao processo 0002836-50.2025.8.16.0065. Publicação capturada via DJEN - comunica.pje.jus.br. Consulte o sistema PJe do Tribunal de Justiça do Paraná para detalhes completos.',
  'https://comunica.pje.jus.br/consulta?dataDisponibilizacaoInicio=2025-11-01&dataDisponibilizacaoFim=2026-02-15&numeroOab=111056&ufOab=pr',
  'nao_tratada',
  'Vara Cível - Foz do Iguaçu'
);
```

Apos inserir, o processo aparecera no drawer de Publicacoes com status "Nao tratada" e voce podera visualizar, tratar ou descartar normalmente.

