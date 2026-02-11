-- Duplicate controle_clientes records from demorais to cordeiro tenant
INSERT INTO controle_clientes (tenant_id, cliente, placa, renavam, cnh, cpf_cnpj, validade_cnh, proximo_prazo, obs, ultima_consulta)
SELECT '272d9707-53b8-498d-bcc1-ea074b6c8c71', cliente, placa, renavam, cnh, cpf_cnpj, validade_cnh, proximo_prazo, obs, ultima_consulta
FROM controle_clientes
WHERE tenant_id = 'd395b3a1-1ea1-4710-bcc1-ff5f6a279750';