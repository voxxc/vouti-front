import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanejadorFile {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string;
  tenant_id: string | null;
  created_at: string;
}

export function usePlanejadorFiles(taskId: string) {
  const { tenantId } = useTenantId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planejador-files', taskId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('planejador_task_files')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PlanejadorFile[];
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!user || !tenantId) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop();
      const path = `${taskId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('planejador-chat-files')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('planejador-chat-files')
        .getPublicUrl(path);

      const { error } = await (supabase as any).from('planejador_task_files').insert({
        task_id: taskId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        tenant_id: tenantId,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-files', taskId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('planejador_task_files').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planejador-files', taskId] }),
  });

  return { files: query.data || [], isLoading: query.isLoading, upload, remove };
}
