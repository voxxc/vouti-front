-- Remover trigger da tabela processos (não tem coluna monitoramento_ativo)
DROP TRIGGER IF EXISTS check_monitoramento_before_delete ON processos;
DROP FUNCTION IF EXISTS prevent_delete_monitored_processo();