
WITH base AS (
  SELECT
    '292d35de-1513-4017-a5d0-9b313607542e'::uuid AS processo_oab_id,
    'd395b3a1-1ea1-4710-bcc1-ff5f6a279750'::uuid AS tenant_id
),
items AS (
  SELECT * FROM (VALUES
    ('SIM-step-001', 'Decisão',         'Despacho/Decisão proferida nos autos. Vistos. Defiro o pedido formulado pela parte autora. Intimem-se. (simulação)',                       (now() - interval '28 days'), '611765567641470977963190128442', 'DESPACHO/DECISÃO 1 - SEM SIGILO (NÍVEL 0) - 66.84KB',          'html'),
    ('SIM-step-002', 'Publicação',      'Pagamento de custas processuais recolhido. Juntada de comprovante aos autos. (simulação)',                                              (now() - interval '21 days'), '611766429608461862793570811858', 'PAGAMENTO DE CUSTAS 1 - SEM SIGILO (NÍVEL 0) - 62.57KB',      'pdf'),
    ('SIM-step-003', 'Intimação',       'Intimação - Aviso de recebimento juntado aos autos. Prazo iniciado. (simulação)',                                                       (now() - interval '14 days'), '611770649802047677966507491275', 'AVISO DE RECEBIMENTO 1 - SEM SIGILO (NÍVEL 0) - 10.93KB',     'pdf'),
    ('SIM-step-004', 'Ato Ordinatório', 'Ato ordinatório. Manifestem-se as partes no prazo legal sobre os documentos juntados. (simulação)',                                       (now() - interval '9 days'),  '611771046402186809928319362334', 'ATO ORDINATÓRIO 1 - SEM SIGILO (NÍVEL 0) - 64.37KB',          'html'),
    ('SIM-step-005', 'Petição',         'Petição de pedido de penhora/arresto protocolada pela parte exequente. (simulação)',                                                       (now() - interval '5 days'),  '611773233264714551207067808354', 'PEDIDO DE PENHORA / ARRESTO 1 - SEM SIGILO (NÍVEL 0) - 125.15KB', 'pdf'),
    ('SIM-step-006', 'Intimação',       'Intimação - Guias de recolhimento/custas emitidas. Comprove o pagamento em 15 dias. (simulação)',                                          (now() - interval '2 days'),  '611773233264714551207073442536', 'GUIAS DE RECOLHIMENTO/DEPÓSITOS/CUSTAS 1 - SEM SIGILO (NÍVEL 0) - 62.93KB', 'pdf')
  ) AS t(step_id, tipo, descricao, data_mov, attachment_id, attachment_name, ext)
),
ins_and AS (
  INSERT INTO processos_oab_andamentos
    (processo_oab_id, tenant_id, data_movimentacao, tipo_movimentacao, descricao, dados_completos, lida)
  SELECT b.processo_oab_id, b.tenant_id, i.data_mov, i.tipo, i.descricao,
         jsonb_build_object('simulacao', true, 'step_id', i.step_id, 'attachments', jsonb_build_array(
            jsonb_build_object('attachment_id', i.attachment_id, 'name', i.attachment_name, 'extension', i.ext)
         )),
         false
  FROM base b CROSS JOIN items i
  ON CONFLICT DO NOTHING
  RETURNING 1
)
INSERT INTO processos_oab_anexos
  (processo_oab_id, tenant_id, attachment_id, attachment_name, extension, status, step_id, is_private)
SELECT b.processo_oab_id, b.tenant_id, i.attachment_id, i.attachment_name, i.ext, 'baixado', i.step_id, false
FROM base b CROSS JOIN items i
ON CONFLICT DO NOTHING;
