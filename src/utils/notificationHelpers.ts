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