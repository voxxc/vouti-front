
-- 1) Estender constraint para incluir 'lead_comment'
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'project_update','task_moved','task_created','mention','comment_added',
    'comment_mention','deadline_assigned','deadline_tagged','project_added',
    'conversation_transferred','planejador_chat_message','processo_processado',
    'andamento_processo','lead_comment'
  ]));

-- 2) Função para reuniao_comentarios
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
    user_id, type, title, content, triggered_by_user_id, tenant_id
  ) VALUES (
    v_creator,
    'lead_comment',
    'Novo comentário no lead',
    COALESCE(v_cliente_nome, v_reuniao_titulo, 'Lead') || ': ' ||
      CASE WHEN length(NEW.comentario) > 140
           THEN substring(NEW.comentario, 1, 140) || '...'
           ELSE NEW.comentario END,
    NEW.user_id,
    NEW.tenant_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_creator_reuniao_comentario ON public.reuniao_comentarios;
CREATE TRIGGER trg_notify_lead_creator_reuniao_comentario
AFTER INSERT ON public.reuniao_comentarios
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_creator_on_reuniao_comentario();

-- 3) Função para reuniao_cliente_comentarios
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
    user_id, type, title, content, triggered_by_user_id, tenant_id
  ) VALUES (
    v_creator,
    'lead_comment',
    'Novo comentário no lead',
    COALESCE(v_cliente_nome, 'Lead') || ': ' ||
      CASE WHEN length(NEW.comentario) > 140
           THEN substring(NEW.comentario, 1, 140) || '...'
           ELSE NEW.comentario END,
    NEW.user_id,
    NEW.tenant_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_lead_creator_cliente_comentario ON public.reuniao_cliente_comentarios;
CREATE TRIGGER trg_notify_lead_creator_cliente_comentario
AFTER INSERT ON public.reuniao_cliente_comentarios
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_creator_on_cliente_comentario();
