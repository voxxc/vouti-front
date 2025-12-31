-- Atualizar função create_project_notification para incluir tenant_id
CREATE OR REPLACE FUNCTION public.create_project_notification(
  notification_type text, 
  notification_title text, 
  notification_content text, 
  project_id_param uuid, 
  task_id_param uuid DEFAULT NULL::uuid, 
  triggered_by uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Buscar o tenant_id do projeto
  SELECT p.tenant_id INTO v_tenant_id
  FROM public.projects p
  WHERE p.id = project_id_param;

  -- Notificar todos os colaboradores do projeto (exceto quem disparou)
  INSERT INTO public.notifications (
    user_id, 
    tenant_id,
    type, 
    title, 
    content, 
    related_project_id, 
    related_task_id, 
    triggered_by_user_id
  )
  SELECT 
    pc.user_id,
    v_tenant_id,
    notification_type,
    notification_title,
    notification_content,
    project_id_param,
    task_id_param,
    triggered_by
  FROM public.project_collaborators pc
  WHERE pc.project_id = project_id_param 
    AND pc.user_id != triggered_by;

  -- Notificar o criador do projeto se não for colaborador e não for quem disparou
  INSERT INTO public.notifications (
    user_id, 
    tenant_id,
    type, 
    title, 
    content, 
    related_project_id, 
    related_task_id, 
    triggered_by_user_id
  )
  SELECT 
    p.created_by,
    v_tenant_id,
    notification_type,
    notification_title,
    notification_content,
    project_id_param,
    task_id_param,
    triggered_by
  FROM public.projects p
  WHERE p.id = project_id_param 
    AND p.created_by != triggered_by
    AND NOT EXISTS (
      SELECT 1 FROM public.project_collaborators pc
      WHERE pc.project_id = project_id_param 
        AND pc.user_id = p.created_by
    );
END;
$function$;

-- Backfill: atualizar notificações existentes com tenant_id NULL
UPDATE public.notifications n
SET tenant_id = p.tenant_id
FROM public.projects p
WHERE n.related_project_id = p.id
  AND n.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;