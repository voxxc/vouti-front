import { supabase } from '@/integrations/supabase/client';

export const createProjectNotification = async (
  type: 'project_update' | 'task_moved' | 'task_created' | 'comment_added',
  title: string,
  content: string,
  projectId: string,
  taskId?: string
) => {
  try {
    const { error } = await supabase.rpc('create_project_notification', {
      notification_type: type,
      notification_title: title,
      notification_content: content,
      project_id_param: projectId,
      task_id_param: taskId
    });

    if (error) {
      console.error('Error creating notification:', error);
    }
  } catch (error) {
    console.error('Error calling notification function:', error);
  }
};

export const sendMentionMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  projectId?: string
) => {
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        message_type: 'mention',
        related_project_id: projectId
      });

    if (error) {
      console.error('Error sending mention message:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in sendMentionMessage:', error);
    throw error;
  }
};

export const notifyTaskMovement = async (
  projectId: string,
  taskTitle: string,
  fromStatus: string,
  toStatus: string,
  movedBy: string
) => {
  const statusTranslations: { [key: string]: string } = {
    'waiting': 'Em Espera',
    'todo': 'A Fazer',
    'progress': 'Andamento',
    'done': 'Concluído'
  };

  await createProjectNotification(
    'task_moved',
    'Tarefa Movimentada',
    `${movedBy} moveu a tarefa "${taskTitle}" de "${statusTranslations[fromStatus]}" para "${statusTranslations[toStatus]}"`,
    projectId
  );
};

export const notifyTaskCreated = async (
  projectId: string,
  taskTitle: string,
  createdBy: string
) => {
  await createProjectNotification(
    'task_created',
    'Nova Tarefa Criada',
    `${createdBy} criou uma nova tarefa: "${taskTitle}"`,
    projectId
  );
};

export const notifyCommentAdded = async (
  projectId: string,
  taskTitle: string,
  commentedBy: string,
  taskId?: string
) => {
  await createProjectNotification(
    'comment_added',
    'Novo Comentário',
    `${commentedBy} adicionou um comentário na tarefa "${taskTitle}"`,
    projectId,
    taskId
  );
};

// Notificacao para responsavel pelo prazo
export const notifyDeadlineAssigned = async (
  deadlineId: string,
  deadlineTitle: string,
  assignedToUserId: string,
  assignedByUserId: string,
  tenantId: string,
  projectId?: string
) => {
  // Nao notificar se o usuario esta atribuindo para si mesmo
  if (assignedToUserId === assignedByUserId) return;

  try {
    // Buscar nome de quem atribuiu
    const { data: assignerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', assignedByUserId)
      .single();

    const assignerName = assignerProfile?.full_name || 'Alguem';

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: assignedToUserId,
        tenant_id: tenantId,
        type: 'deadline_assigned',
        title: 'Novo Prazo Atribuido',
        content: `${assignerName} atribuiu o prazo "${deadlineTitle}" para voce.`,
        triggered_by_user_id: assignedByUserId,
        related_project_id: projectId || null,
        related_task_id: deadlineId,
      });

    if (error) {
      console.error('Erro ao criar notificacao de prazo:', error);
    }
  } catch (error) {
    console.error('Erro ao notificar prazo atribuido:', error);
  }
};

// Notificacao para usuarios tagueados no prazo
export const notifyDeadlineTagged = async (
  deadlineId: string,
  deadlineTitle: string,
  taggedUserIds: string[],
  taggedByUserId: string,
  tenantId: string,
  projectId?: string
) => {
  if (taggedUserIds.length === 0) return;

  try {
    // Buscar nome de quem tagueou
    const { data: taggerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', taggedByUserId)
      .single();

    const taggerName = taggerProfile?.full_name || 'Alguem';

    // Criar notificacao para cada usuario tagueado (exceto quem tagueou)
    const notifications = taggedUserIds
      .filter(userId => userId !== taggedByUserId)
      .map(userId => ({
        user_id: userId,
        tenant_id: tenantId,
        type: 'deadline_tagged',
        title: 'Voce foi marcado em um prazo',
        content: `${taggerName} marcou voce no prazo "${deadlineTitle}".`,
        triggered_by_user_id: taggedByUserId,
        related_project_id: projectId || null,
        related_task_id: deadlineId,
      }));

    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Erro ao criar notificacoes de tags:', error);
      }
    }
  } catch (error) {
    console.error('Erro ao notificar usuarios tagueados:', error);
  }
};