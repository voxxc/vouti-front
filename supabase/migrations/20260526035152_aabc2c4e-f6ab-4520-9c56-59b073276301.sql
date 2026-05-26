UPDATE public.processos_oab
SET tracking_id = NULL,
    monitoramento_ativo = false,
    updated_at = now()
WHERE numero_cnj = '0044263-62.2025.8.16.0021'
  AND tenant_id = '27492091-e05d-46a8-9ee8-b3b47ec894e4';