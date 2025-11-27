-- Atualizar dados existentes para o tenant SOLVENZA (ID: 27492091-e05d-46a8-9ee8-b3b47ec894e4)
-- Isso associa todos os dados existentes ao cliente SOLVENZA

UPDATE profiles SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' 
WHERE tenant_id IS NULL 
AND email NOT LIKE '%@metalsystem.local%'
AND email NOT LIKE '%@vouti.bio%'
AND email NOT LIKE '%@vlink.bio%';

UPDATE user_roles SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE clientes SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE cliente_parcelas SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE cliente_dividas SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE cliente_documentos SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE cliente_pagamento_comentarios SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE projects SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE project_sectors SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE project_columns SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE project_collaborators SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE task_comments SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE task_files SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE deadlines SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE deadline_comentarios SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE deadline_tags SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processos SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_movimentacoes SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_documentos SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_historico SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_etiquetas SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_monitoramento_judit SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_andamentos_judit SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_monitoramento_escavador SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_atualizacoes_escavador SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE processo_movimentacao_conferencia SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE etiquetas SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE grupos_acoes SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE leads_captacao SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE lead_comments SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE messages SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE message_attachments SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE notifications SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE client_history SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE controladoria_processos SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE busca_processos_oab SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reunioes SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reuniao_clientes SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reuniao_comentarios SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reuniao_arquivos SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reuniao_cliente_comentarios SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reuniao_cliente_arquivos SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE reuniao_status SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE sector_templates SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE tribunais SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE comarcas SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;
UPDATE tipos_acao SET tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4' WHERE tenant_id IS NULL;