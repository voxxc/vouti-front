ALTER TABLE public.totp_wallets ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.totp_tokens ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, (row_number() OVER (PARTITION BY tenant_id ORDER BY created_at, id))::int AS rn
  FROM public.totp_wallets
)
UPDATE public.totp_wallets w SET sort_order = o.rn FROM ordered o WHERE w.id = o.id;

WITH ordered AS (
  SELECT id, (row_number() OVER (PARTITION BY wallet_id ORDER BY created_at, id))::int AS rn
  FROM public.totp_tokens
)
UPDATE public.totp_tokens t SET sort_order = o.rn FROM ordered o WHERE t.id = o.id;

CREATE INDEX IF NOT EXISTS totp_wallets_tenant_sort_idx ON public.totp_wallets (tenant_id, sort_order);
CREATE INDEX IF NOT EXISTS totp_tokens_wallet_sort_idx ON public.totp_tokens (wallet_id, sort_order);