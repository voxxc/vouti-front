-- 1) Atualizar funções de notificação de lead para gravar related_task_id = cliente_id
CREATE OR REPLACE FUNCTION public.notify_lead_creator_on_reuniao_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
  v_creator uuid;
  v_cliente_nome text;
  v_reuniao_titulo text;
BEGIN
  SELECT r.cliente_id, COALESCE(r.cliente_nome, r.titulo)
    INTO v_cliente_id, v_reuniao_titulo
  FROM public.reunioes r
  WHERE r.id = NEW.reuniao_id;

  IF v_cliente_id IS NOT NULL THEN
    SELECT rc.user_id, rc.nome
      INTO v_creator, v_cliente_nome
    FROM public.reuniao_clientes rc
    WHERE rc.id = v_cliente_id;
  END IF;

  IF v_creator IS NULL OR v_creator = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, content, triggered_by_user_id, tenant_id, related_task_id
  ) VALUES (
    v_creator,
    'lead_comment',
    'Novo comentário no lead',
    COALESCE(v_cliente_nome, v_reuniao_titulo, 'Lead') || ': ' ||
      CASE WHEN length(NEW.comentario) > 140
           THEN substring(NEW.comentario, 1, 140) || '...'
           ELSE NEW.comentario END,
    NEW.user_id,
    NEW.tenant_id,
    v_cliente_id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_lead_creator_on_cliente_comentario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
  v_cliente_nome text;
BEGIN
  SELECT rc.user_id, rc.nome
    INTO v_creator, v_cliente_nome
  FROM public.reuniao_clientes rc
  WHERE rc.id = NEW.cliente_id;

  IF v_creator IS NULL OR v_creator = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id, type, title, content, triggered_by_user_id, tenant_id, related_task_id
  ) VALUES (
    v_creator,
    'lead_comment',
    'Novo comentário no lead',
    COALESCE(v_cliente_nome, 'Lead') || ': ' ||
      CASE WHEN length(NEW.comentario) > 140
           THEN substring(NEW.comentario, 1, 140) || '...'
           ELSE NEW.comentario END,
    NEW.user_id,
    NEW.tenant_id,
    NEW.cliente_id
  );

  RETURN NEW;
END;
$$;

-- 2) Backfill: para notificações lead_comment antigas sem related_task_id,
-- tentar resolver pelo nome do lead (prefixo antes do ":") + tenant_id.
-- Só atualiza quando o match é único.
UPDATE public.notifications n
SET related_task_id = sub.cliente_id
FROM (
  SELECT
    nf.id AS notif_id,
    rc.id AS cliente_id
  FROM public.notifications nf
  JOIN public.reuniao_clientes rc
    ON rc.tenant_id = nf.tenant_id
   AND lower(rc.nome) = lower(trim(split_part(nf.content, ':', 1)))
  WHERE nf.type = 'lead_comment'
    AND nf.related_task_id IS NULL
    AND nf.tenant_id IS NOT NULL
    AND nf.content IS NOT NULL
  GROUP BY nf.id, rc.id
  HAVING (
    SELECT count(*) FROM public.reuniao_clientes rc2
    WHERE rc2.tenant_id = (SELECT tenant_id FROM public.notifications WHERE id = nf.id)
      AND lower(rc2.nome) = lower(trim(split_part(nf.content, ':', 1)))
  ) = 1
) sub
WHERE n.id = sub.notif_id;