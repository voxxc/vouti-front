INSERT INTO publicacoes (
  tenant_id, processo_oab_id, numero_processo, data_disponibilizacao, data_publicacao,
  tipo, diario_sigla, diario_nome, comarca, orgao, responsavel, partes,
  nome_pesquisado, conteudo_completo, status, origem, metadata
) VALUES
(
  'd395b3a1-1ea1-4710-bcc1-ff5f6a279750',
  '292d35de-1513-4017-a5d0-9b313607542e',
  '0005137-68.2026.8.16.0021',
  CURRENT_DATE - INTERVAL '3 days',
  CURRENT_DATE - INTERVAL '2 days',
  'Decisão',
  'DJEN',
  'Diário da Justiça Eletrônico Nacional',
  'Londrina',
  '1ª Vara Cível de Londrina',
  'Dr. João Carlos Pereira (Juiz de Direito)',
  'AUTOR: Maria Helena de Souza x RÉU: Banco Santander Brasil S/A',
  'Demorais Advocacia',
  E'Vistos.\n\nTrata-se de ação de obrigação de fazer cumulada com indenização por danos morais ajuizada por MARIA HELENA DE SOUZA em face de BANCO SANTANDER BRASIL S/A.\n\nA parte autora postula tutela de urgência para determinar a imediata exclusão de seu nome dos cadastros restritivos de crédito (SPC/Serasa), bem como a suspensão dos descontos indevidos realizados em sua conta-corrente.\n\nPresentes os requisitos do art. 300 do CPC — probabilidade do direito (extratos bancários demonstrando débitos não reconhecidos) e perigo de dano (negativação em curso) —, DEFIRO A TUTELA DE URGÊNCIA para:\n\n(a) determinar que o requerido, no prazo de 5 (cinco) dias úteis, providencie a exclusão do nome da autora dos cadastros restritivos de crédito relativos ao contrato nº 8847291, sob pena de multa diária de R$ 500,00 (quinhentos reais), limitada a R$ 30.000,00;\n\n(b) determinar a suspensão imediata dos descontos referentes ao mesmo contrato, no mesmo prazo e sob a mesma cominação.\n\nCite-se o requerido para contestar no prazo legal.\n\nIntimem-se.\n\nLondrina, data da assinatura digital.\n\nJOÃO CARLOS PEREIRA\nJuiz de Direito',
  'nao_tratada',
  'monitoramento_processo',
  '{"simulacao": true}'::jsonb
),
(
  'd395b3a1-1ea1-4710-bcc1-ff5f6a279750',
  '292d35de-1513-4017-a5d0-9b313607542e',
  '0005137-68.2026.8.16.0021',
  CURRENT_DATE - INTERVAL '1 days',
  CURRENT_DATE,
  'Sentença',
  'DJEN',
  'Diário da Justiça Eletrônico Nacional',
  'Londrina',
  '1ª Vara Cível de Londrina',
  'Dr. João Carlos Pereira (Juiz de Direito)',
  'AUTOR: Maria Helena de Souza x RÉU: Banco Santander Brasil S/A',
  'Demorais Advocacia',
  E'SENTENÇA\n\nVistos etc.\n\nMARIA HELENA DE SOUZA ajuizou a presente ação em face de BANCO SANTANDER BRASIL S/A, alegando, em síntese, ter sofrido descontos indevidos em sua conta-corrente e negativação ilícita de seu nome em razão de contrato que afirma jamais ter celebrado.\n\nRegularmente citado, o requerido apresentou contestação sustentando a regularidade da contratação, juntando suposta gravação telefônica. A autora replicou impugnando a autenticidade da prova.\n\nÉ o relatório. DECIDO.\n\nO feito comporta julgamento antecipado, nos termos do art. 355, I, do CPC.\n\nA perícia técnica realizada nos autos (laudo de fls. 187/214) concluiu pela inautenticidade da gravação apresentada pelo requerido, evidenciando edição posterior do arquivo de áudio. Tal circunstância, somada à ausência de qualquer documento físico assinado pela autora, conduz inexoravelmente ao reconhecimento da fraude.\n\nNos termos da Súmula 479 do STJ, as instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes praticadas por terceiros no âmbito de operações bancárias.\n\nQuanto ao dano moral, restou amplamente demonstrado o abalo psicológico sofrido pela autora, atestado, inclusive, por prontuário médico que registra quadro de ansiedade desencadeado pelos eventos.\n\nDIANTE DO EXPOSTO, JULGO PARCIALMENTE PROCEDENTES os pedidos formulados na inicial para:\n\n(a) DECLARAR a inexistência do contrato nº 8847291 e, por consequência, a inexigibilidade dos débitos dele decorrentes;\n\n(b) CONDENAR o requerido à restituição em dobro dos valores indevidamente descontados, conforme apurado em liquidação, acrescidos de correção monetária pelo INPC desde cada desembolso e juros de mora de 1% ao mês a partir da citação;\n\n(c) CONDENAR o requerido ao pagamento de indenização por danos morais no valor de R$ 15.000,00 (quinze mil reais), corrigidos pelo INPC a partir desta data (Súmula 362 STJ) e acrescidos de juros de mora de 1% ao mês desde o evento danoso (Súmula 54 STJ).\n\nCondeno o requerido, ainda, ao pagamento das custas processuais e dos honorários advocatícios, que fixo em 15% sobre o valor da condenação, nos termos do art. 85, §2º, do CPC.\n\nP.R.I.\n\nLondrina, data da assinatura digital.\n\nJOÃO CARLOS PEREIRA\nJuiz de Direito',
  'nao_tratada',
  'monitoramento_processo',
  '{"simulacao": true}'::jsonb
);