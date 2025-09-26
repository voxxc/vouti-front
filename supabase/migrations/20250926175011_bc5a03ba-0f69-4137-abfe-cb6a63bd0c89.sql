-- Create messages table for internal communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_project_id UUID NULL,
  message_type TEXT CHECK (message_type IN ('direct', 'mention', 'notification')) DEFAULT 'direct',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT CHECK (type IN ('project_update', 'task_moved', 'task_created', 'mention', 'comment_added')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_project_id UUID NULL,
  related_task_id UUID NULL,
  triggered_by_user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_collaborators table to track who has access to which projects
CREATE TABLE public.project_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor',
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid()::text = sender_id::text);

CREATE POLICY "Users can update their received messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid()::text = receiver_id::text);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for project_collaborators
CREATE POLICY "Users can view collaborators of their projects" 
ON public.project_collaborators 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_collaborators.project_id 
    AND pc.user_id::text = auth.uid()::text
  )
);

CREATE POLICY "Project owners can manage collaborators" 
ON public.project_collaborators 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.project_collaborators pc 
    WHERE pc.project_id = project_collaborators.project_id 
    AND pc.user_id::text = auth.uid()::text 
    AND pc.role = 'owner'
  )
);

-- Function to create notifications automatically
CREATE OR REPLACE FUNCTION public.create_project_notification(
  notification_type TEXT,
  notification_title TEXT,
  notification_content TEXT,
  project_id_param UUID,
  task_id_param UUID DEFAULT NULL,
  triggered_by UUID DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND pc.user_id::text != triggered_by::text;
END;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime functionality
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.project_collaborators REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;