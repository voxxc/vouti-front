-- Atualizar função para incluir o criador do projeto nas notificações
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
BEGIN
  -- Insert notifications for all project collaborators except the trigger user
  INSERT INTO public.notifications (user_id, type, title, content, related_project_id, related_task_id, triggered_by_user_id)
  SELECT 
    pc.user_id,
    notification_type,
    notification_title,
    notification_content,
    project_id_param,
    task_id_param,
    triggered_by
  FROM public.project_collaborators pc
  WHERE pc.project_id = project_id_param 
    AND pc.user_id != triggered_by;

  -- Also notify the project creator if they are not a collaborator and not the trigger user
  INSERT INTO public.notifications (user_id, type, title, content, related_project_id, related_task_id, triggered_by_user_id)
  SELECT 
    p.created_by,
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